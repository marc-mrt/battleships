import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import type { WSContext, WSMessageReceive } from "hono/ws";
import pg from "pg";
import { z } from "zod";
import { BadRequestError } from "./controllers/errors";
import { runMigrations } from "./database";
import { getSessionByPlayerId } from "./database/session";
import type { Env } from "./env";
import {
  createClearSessionCookie,
  createSessionCookie,
  parseSessionCookie,
} from "./middlewares/cookies";
import { errorHandler } from "./middlewares/error";

import type {
  Session,
  SessionStatus,
  SessionWaitingForBoats,
} from "./models/session";
import * as SessionService from "./services/session";
import { GameSessionManager } from "./websocket";

const { Pool } = pg;

const env: Env = {
  DATABASE_CONNECTION_STRING: process.env.DATABASE_CONNECTION_STRING || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "",
};

if (!env.DATABASE_CONNECTION_STRING) {
  console.error("DATABASE_CONNECTION_STRING environment variable is required");
  process.exit(1);
}
if (!env.JWT_SECRET) {
  console.error("JWT_SECRET environment variable is required");
  process.exit(1);
}

const db = new Pool({
  connectionString: env.DATABASE_CONNECTION_STRING,
});

const wsManager = new GameSessionManager(db);

type HonoEnv = { Variables: { db: typeof db; env: Env } };

const app = new Hono<HonoEnv>();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use("*", async (c, next) => {
  c.set("db", db);
  c.set("env", env);
  await next();
});

app.use("*", async (c, next) => {
  const origins = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
  const corsMiddleware = cors({ origin: origins, credentials: true });
  return corsMiddleware(c, next);
});

app.onError(errorHandler);

app.get("/healthcheck", (c) => {
  return c.json({ status: "ok" });
});

const CreateSessionRequestBody = z.object({
  username: z.string(),
});

interface PlayerResponse {
  id: string;
  username: string;
  isOwner: boolean;
  wins: number;
}

interface SessionResponse {
  slug: string;
  status: SessionStatus;
  player: PlayerResponse;
  opponent: PlayerResponse | null;
}

function isPlayerOwner(session: Session, playerId: string): boolean {
  return playerId === session.owner.id;
}

function getOpponent(
  session: Session,
  playerId: string,
): PlayerResponse | null {
  if (session.status === "waiting_for_opponent") {
    return null;
  }

  const playerIsOwner = isPlayerOwner(session, playerId);
  const player = playerIsOwner ? session.friend : session.owner;
  const opponentIsOwner = !playerIsOwner;

  return {
    id: player.id,
    username: player.username,
    isOwner: opponentIsOwner,
    wins: player.wins,
  };
}

function getPlayer(session: Session, playerId: string): PlayerResponse {
  const playerIsOwner = isPlayerOwner(session, playerId);
  let username: string;
  let wins: number;
  if (playerIsOwner) {
    username = session.owner.username;
    wins = session.owner.wins;
  } else {
    if (session.status === "waiting_for_opponent") {
      throw new Error("Invalid session state for player mapping");
    }
    username = session.friend.username;
    wins = session.friend.wins;
  }

  return { id: playerId, username, isOwner: playerIsOwner, wins };
}

function mapToSessionResponse(
  session: Session,
  playerId: string,
): SessionResponse {
  return {
    slug: session.slug,
    status: session.status,
    player: getPlayer(session, playerId),
    opponent: getOpponent(session, playerId),
  };
}

function isProduction(): boolean {
  return env.ALLOWED_ORIGINS.includes("https://");
}

app.post("/sessions", async (c) => {
  const body = await c.req.json();
  const result = CreateSessionRequestBody.safeParse(body);
  if (!result.success) {
    throw new BadRequestError(`Invalid request body: ${result.error.message}`);
  }

  const { username } = result.data;
  const session = await SessionService.createSession({
    db,
    username,
  });
  const playerId = session.owner.id;

  const cookie = await createSessionCookie({
    sessionId: session.id,
    playerId,
    jwtSecret: env.JWT_SECRET,
    isProduction: isProduction(),
  });

  const mapped = mapToSessionResponse(session, playerId);
  return c.json(mapped, 201, { "Set-Cookie": cookie });
});

const JoinSessionRequestBody = z.object({
  username: z.string(),
});

app.post("/sessions/:slug/join", async (c) => {
  const body = await c.req.json();
  const result = JoinSessionRequestBody.safeParse(body);
  if (!result.success) {
    throw new BadRequestError(`Invalid request body: ${result.error.message}`);
  }

  const slug = c.req.param("slug");
  const { username } = result.data;
  const session: SessionWaitingForBoats = await SessionService.joinSession({
    db,
    slug,
    username,
  });
  const playerId = session.friend.id;

  const cookie = await createSessionCookie({
    sessionId: session.id,
    playerId,
    jwtSecret: env.JWT_SECRET,
    isProduction: isProduction(),
  });

  wsManager.notifyOpponentJoined(session.id, session.owner.id, {
    session: { status: session.status },
    opponent: {
      id: session.friend.id,
      username: session.friend.username,
      isOwner: false,
      wins: session.friend.wins,
    },
  });

  const mapped = mapToSessionResponse(session, playerId);
  return c.json(mapped, 200, { "Set-Cookie": cookie });
});

app.get("/sessions", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionCookie = await parseSessionCookie({
    cookieHeader,
    jwtSecret: env.JWT_SECRET,
  });

  if (!sessionCookie) {
    return c.body(null, 204);
  }

  const session = await getSessionByPlayerId({
    db,
    playerId: sessionCookie.playerId,
  });

  if (!session) {
    return c.body(null, 204);
  }

  const mapped = mapToSessionResponse(session, sessionCookie.playerId);
  return c.json(mapped);
});

app.post("/sessions/disconnect", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionCookie = await parseSessionCookie({
    cookieHeader,
    jwtSecret: env.JWT_SECRET,
  });

  if (!sessionCookie) {
    throw new BadRequestError("No active session");
  }

  const session = await SessionService.getSessionByPlayerId({
    db,
    playerId: sessionCookie.playerId,
  });

  const { remainingPlayer } = await SessionService.disconnectFromSession({
    db,
    playerId: sessionCookie.playerId,
  });

  if (remainingPlayer != null) {
    wsManager.notifyOpponentDisconnected(session.id, remainingPlayer.id, {
      session: { status: "waiting_for_opponent" },
    });
  }

  const clearCookie = createClearSessionCookie({
    isProduction: isProduction(),
  });

  return c.body(null, 204, { "Set-Cookie": clearCookie });
});

app.get(
  "/ws",
  upgradeWebSocket(async (c: Context) => {
    const cookieHeader = c.req.header("Cookie");
    const sessionCookie = await parseSessionCookie({
      cookieHeader,
      jwtSecret: env.JWT_SECRET,
    });

    if (!sessionCookie) {
      console.log("[WebSocket] Unauthorized connection attempt - no valid cookie");
      return {
        onOpen: (_event: Event, ws: WSContext) => {
          ws.close(1008, "Unauthorized");
        },
      };
    }

    const { sessionId, playerId } = sessionCookie;

    return {
      onOpen: (_event: Event, ws: WSContext) => {
        console.log(
          `[WebSocket] New connection for player ${playerId} in session ${sessionId}`,
        );
        wsManager.registerConnection(ws, playerId, sessionId);
      },
      onMessage: async (event: MessageEvent<WSMessageReceive>, ws: WSContext) => {
        const message =
          typeof event.data === "string" ? event.data : event.data.toString();
        await wsManager.handleMessage(ws, message);
      },
      onClose: (_event: CloseEvent, ws: WSContext) => {
        wsManager.handleClose(ws);
      },
      onError: (event: Event, ws: WSContext) => {
        wsManager.handleError(ws, event);
      },
    };
  }),
);

const PORT = parseInt(process.env.PORT || "3000", 10);

async function main() {
  await runMigrations(db);

  const server = serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    },
  );

  injectWebSocket(server);
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await db.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await db.end();
  process.exit(0);
});
