import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { BadRequestError } from "./controllers/errors";
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

export { GameSession } from "./durable-objects/game-session";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.use("*", async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
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

function isProduction(env: Env): boolean {
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
    db: c.env.DB,
    username,
  });
  const playerId = session.owner.id;

  const cookie = await createSessionCookie({
    sessionId: session.id,
    playerId,
    jwtSecret: c.env.JWT_SECRET,
    isProduction: isProduction(c.env),
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
    db: c.env.DB,
    slug,
    username,
  });
  const playerId = session.friend.id;

  const cookie = await createSessionCookie({
    sessionId: session.id,
    playerId,
    jwtSecret: c.env.JWT_SECRET,
    isProduction: isProduction(c.env),
  });

  const id = c.env.GAME_SESSION.idFromName(session.id);
  const stub = c.env.GAME_SESSION.get(id);
  await stub.fetch(
    new Request("http://internal/notify", {
      method: "POST",
      body: JSON.stringify({
        type: "opponent_joined",
        targetPlayerId: session.owner.id,
        data: {
          session: { status: session.status },
          opponent: {
            id: session.friend.id,
            username: session.friend.username,
            isOwner: false,
            wins: session.friend.wins,
          },
        },
      }),
    }),
  );

  const mapped = mapToSessionResponse(session, playerId);
  return c.json(mapped, 200, { "Set-Cookie": cookie });
});

app.get("/sessions", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionCookie = await parseSessionCookie({
    cookieHeader,
    jwtSecret: c.env.JWT_SECRET,
  });

  if (!sessionCookie) {
    return c.body(null, 204);
  }

  const session = await getSessionByPlayerId({
    db: c.env.DB,
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
    jwtSecret: c.env.JWT_SECRET,
  });

  if (!sessionCookie) {
    throw new BadRequestError("No active session");
  }

  const session = await SessionService.getSessionByPlayerId({
    db: c.env.DB,
    playerId: sessionCookie.playerId,
  });

  const { remainingPlayer } = await SessionService.disconnectFromSession({
    db: c.env.DB,
    playerId: sessionCookie.playerId,
  });

  if (remainingPlayer != null) {
    const id = c.env.GAME_SESSION.idFromName(session.id);
    const stub = c.env.GAME_SESSION.get(id);
    await stub.fetch(
      new Request("http://internal/notify", {
        method: "POST",
        body: JSON.stringify({
          type: "opponent_disconnected",
          targetPlayerId: remainingPlayer.id,
          data: {
            session: { status: "waiting_for_opponent" },
          },
        }),
      }),
    );
  }

  const clearCookie = createClearSessionCookie({
    isProduction: isProduction(c.env),
  });

  return c.body(null, 204, { "Set-Cookie": clearCookie });
});

app.get("/ws", async (c) => {
  const cookieHeader = c.req.header("Cookie");
  const sessionCookie = await parseSessionCookie({
    cookieHeader,
    jwtSecret: c.env.JWT_SECRET,
  });

  if (!sessionCookie) {
    return c.text("Unauthorized", 401);
  }

  const id = c.env.GAME_SESSION.idFromName(sessionCookie.sessionId);
  const stub = c.env.GAME_SESSION.get(id);
  return stub.fetch(c.req.raw);
});

export default app;
