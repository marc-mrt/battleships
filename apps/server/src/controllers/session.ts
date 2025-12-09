import type { Request, Response } from "express";
import { z } from "zod";
import { getSessionByPlayerId } from "../database/session";
import { parseSessionCookie, setSessionCookie } from "../middlwares/cookies";
import type {
  Session,
  SessionStatus,
  SessionWaitingForBoats,
} from "../models/session";
import * as SessionService from "../services/session";
import { BadRequestError } from "./errors";

const CreateSessionRequestBody = z.object({
  username: z.string(),
});

export async function createSession(request: Request, response: Response) {
  const result = CreateSessionRequestBody.safeParse(request.body);
  if (!result.success) {
    throw new BadRequestError(`Invalid request body: ${result.error.message}`);
  }

  const { username } = result.data;
  const session = await SessionService.createSession({ username });
  const playerId = session.owner.id;

  setSessionCookie({
    response,
    payload: {
      sessionId: session.id,
      playerId,
    },
  });

  const mapped = mapToSessionResponse(session, playerId);
  return response.status(201).send(mapped);
}

const JoinSessionRequestBody = z.object({
  username: z.string(),
});

export async function joinSession(request: Request, response: Response) {
  const result = JoinSessionRequestBody.safeParse(request.body);
  if (!result.success) {
    throw new BadRequestError(`Invalid request body: ${result.error.message}`);
  }

  const { slug } = request.params;
  const { username } = result.data;
  const session: SessionWaitingForBoats = await SessionService.joinSession({
    slug,
    username,
  });
  const playerId = session.friend.id;

  setSessionCookie({
    response,
    payload: {
      sessionId: session.id,
      playerId,
    },
  });

  const mapped = mapToSessionResponse(session, playerId);
  return response.status(200).send(mapped);
}

export async function getCurrentSession(request: Request, response: Response) {
  const cookieHeader = request.headers.cookie;
  const sessionCookie = parseSessionCookie(cookieHeader);
  if (!sessionCookie) {
    return response.status(204).send();
  }

  const session = await getSessionByPlayerId(sessionCookie.playerId);
  if (!session) {
    return response.status(204).send();
  }
  const mapped = mapToSessionResponse(session, sessionCookie.playerId);
  return response.status(200).send(mapped);
}

interface PlayerResponse {
  id: string;
  username: string;
  isOwner: boolean;
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

  return { id: player.id, username: player.username, isOwner: opponentIsOwner };
}

function getPlayer(session: Session, playerId: string): PlayerResponse {
  const playerIsOwner = isPlayerOwner(session, playerId);
  let username: string;
  if (playerIsOwner) {
    username = session.owner.username;
  } else {
    if (session.status === "waiting_for_opponent") {
      throw new Error("Invalid session state for player mapping");
    }
    username = session.friend.username;
  }

  return { id: playerId, username, isOwner: playerIsOwner };
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
