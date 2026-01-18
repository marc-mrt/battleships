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

interface CreateSessionPayload {
  db: D1Database;
  username: string;
}

export async function createSession(
  payload: CreateSessionPayload,
): Promise<Session> {
  const { db, username } = payload;
  const playerOwner: Player = await PlayerService.createPlayer({
    db,
    username,
  });
  const session: Session = await SessionDB.createSession({
    db,
    owner: { playerId: playerOwner.id },
  });
  return session;
}

interface JoinSessionPayload {
  db: D1Database;
  slug: string;
  username: string;
}

export async function joinSession(
  payload: JoinSessionPayload,
): Promise<SessionWaitingForBoats> {
  const { db, slug, username } = payload;

  const player: Player = await PlayerService.createPlayer({ db, username });
  const session: SessionWaitingForBoats = await SessionDB.assignFriendToSession(
    {
      db,
      slug,
      friend: { playerId: player.id },
    },
  );

  return session;
}

interface GetSessionByPlayerIdPayload {
  db: D1Database;
  playerId: string;
}

export async function getSessionByPlayerId(
  payload: GetSessionByPlayerIdPayload,
): Promise<Session> {
  const { db, playerId } = payload;
  const session: Session | null = await SessionDB.getSessionByPlayerId({
    db,
    playerId,
  });
  if (!session) {
    throw new SessionNotFoundError(playerId);
  }

  return session;
}

interface SetCurrentTurnPayload {
  db: D1Database;
  sessionId: string;
  playerId: string;
}

export async function setCurrentTurn(
  payload: SetCurrentTurnPayload,
): Promise<SessionPlaying> {
  const { db, sessionId, playerId } = payload;
  const session: SessionPlaying = await SessionDB.setCurrentTurn({
    db,
    sessionId,
    playerId,
  });

  return session;
}

interface SetWinnerPayload {
  db: D1Database;
  sessionId: string;
  winnerId: string;
}

export async function setWinner(
  payload: SetWinnerPayload,
): Promise<SessionGameOver> {
  const { db, sessionId, winnerId } = payload;
  await PlayerDB.incrementWins({ db, playerId: winnerId });

  const session: SessionGameOver = await SessionDB.setWinner({
    db,
    sessionId,
    winnerId,
  });

  return session;
}

interface ResetSessionForPlayerPayload {
  db: D1Database;
  playerId: string;
}

export async function resetSessionForPlayer(
  payload: ResetSessionForPlayerPayload,
): Promise<SessionWaitingForBoats> {
  const { db, playerId } = payload;
  const session: Session = await getSessionByPlayerId({ db, playerId });

  if (session.owner.id !== playerId) {
    throw new UnauthorizedActionError();
  }

  if (isSessionPlaying(session)) {
    throw new GameInProgressError();
  }

  const updatedSession: SessionWaitingForBoats =
    await SessionDB.resetSessionToBoatPlacement({ db, sessionId: session.id });
  return updatedSession;
}

interface DisconnectFromSessionPayload {
  db: D1Database;
  playerId: string;
}

interface DisconnectFromSessionResult {
  remainingPlayer: Player | null;
}

export async function disconnectFromSession(
  payload: DisconnectFromSessionPayload,
): Promise<DisconnectFromSessionResult> {
  const { db, playerId } = payload;
  const session: Session = await getSessionByPlayerId({ db, playerId });
  const isOwner = session.owner.id === playerId;

  const { remainingPlayer } = await SessionDB.disconnectPlayerFromSession({
    db,
    sessionId: session.id,
    leavingPlayerId: playerId,
    isOwner,
  });

  return { remainingPlayer };
}
