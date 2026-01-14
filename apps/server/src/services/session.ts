import * as PlayerDB from "../database/player";
import * as SessionDB from "../database/session";
import type { Player } from "../models/player";
import {
  isSessionPlaying,
  type Session,
  type SessionGameOver,
  type SessionPlaying,
  type SessionWaitingForBoats,
} from "../models/session";
import {
  GameInProgressError,
  SessionNotFoundError,
  UnauthorizedActionError,
} from "./errors";
import * as PlayerService from "./player";
import * as WebSocketBroadcaster from "./websocket-broadcaster";

interface CreateSessionPayload {
  username: string;
}

export async function createSession(
  payload: CreateSessionPayload,
): Promise<Session> {
  const { username } = payload;
  const playerOwner: Player = await PlayerService.createPlayer({ username });
  const session: Session = await SessionDB.createSession({
    owner: { playerId: playerOwner.id },
  });
  return session;
}

interface JoinSessionPayload {
  slug: string;
  username: string;
}

export async function joinSession(
  payload: JoinSessionPayload,
): Promise<SessionWaitingForBoats> {
  const { slug, username } = payload;

  const player: Player = await PlayerService.createPlayer({ username });
  const session: SessionWaitingForBoats = await SessionDB.assignFriendToSession(
    {
      slug,
      friend: { playerId: player.id },
    },
  );

  WebSocketBroadcaster.sendOpponentJoinedMessage(session.owner.id, {
    session: {
      status: session.status,
    },
    opponent: {
      id: player.id,
      username: player.username,
      isOwner: false,
      wins: player.wins,
    },
  });

  return session;
}

export async function getSessionByPlayerId(playerId: string): Promise<Session> {
  const session: Session | null =
    await SessionDB.getSessionByPlayerId(playerId);
  if (!session) {
    throw new SessionNotFoundError(playerId);
  }

  return session;
}

export async function setCurrentTurn(
  sessionId: string,
  playerId: string,
): Promise<SessionPlaying> {
  const session: SessionPlaying = await SessionDB.setCurrentTurn({
    sessionId,
    playerId,
  });

  return session;
}

export async function setWinner(
  sessionId: string,
  winnerId: string,
): Promise<SessionGameOver> {
  await PlayerDB.incrementWins(winnerId);

  const session: SessionGameOver = await SessionDB.setWinner({
    sessionId,
    winnerId,
  });

  return session;
}

export async function resetSessionForPlayer(
  playerId: string,
): Promise<SessionWaitingForBoats> {
  const session: Session = await getSessionByPlayerId(playerId);

  if (session.owner.id !== playerId) {
    throw new UnauthorizedActionError();
  }

  if (isSessionPlaying(session)) {
    throw new GameInProgressError();
  }

  const updatedSession: SessionWaitingForBoats =
    await SessionDB.resetSessionToBoatPlacement(session.id);
  return updatedSession;
}
