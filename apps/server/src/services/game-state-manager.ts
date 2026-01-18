import type {
  GameInProgressState,
  GameOverState,
  LastShot,
  NewGameStartedMessage,
} from "game-messages";
import { TOTAL_BOATS_COUNT } from "game-rules";
import * as R from "ramda";
import type { Boat } from "../models/boat";
import type { Coordinates } from "../models/coordinates";
import {
  isSessionPlaying,
  type Session,
  type SessionGameOver,
  type SessionPlaying,
  type SessionWaitingForBoats,
} from "../models/session";
import * as BoatService from "./boat";
import { InvalidGameStateError } from "./errors";
import {
  determineNextTurnPlayer,
  getOpponentId,
  getOpponentShotsAgainstPlayer,
  getPlayerBoats,
  getPlayerShots,
  getSunkOpponentBoats,
  validatePlayerTurn,
} from "./game-utils";
import * as SessionService from "./session";
import * as ShotService from "./shot";

const COIN_FLIP_THRESHOLD = 0.5;

type SessionWithPlayers = SessionPlaying | SessionGameOver;

function getPlayerWins(session: SessionWithPlayers, playerId: string): number {
  if (session.owner.id === playerId) {
    return session.owner.wins;
  }
  return session.friend.wins;
}

function getOpponentWins(
  session: SessionWithPlayers,
  playerId: string,
): number {
  const opponentId = getOpponentId(session, playerId);
  return getPlayerWins(session, opponentId);
}

interface CreateInGameStatePayload {
  turn: "player" | "opponent";
  session: SessionPlaying;
  playerId: string;
  lastShot: LastShot | null;
}

export function createInGameState(
  payload: CreateInGameStatePayload,
): GameInProgressState {
  const { turn, session, playerId, lastShot } = payload;
  return {
    status: "in_progress",
    turn,
    lastShot,
    session: {
      status: session.status,
    },
    player: {
      boats: getPlayerBoats(playerId)(session),
      shots: getPlayerShots(playerId)(session.shots),
      wins: getPlayerWins(session, playerId),
    },
    opponent: {
      sunkBoats: getSunkOpponentBoats(playerId)(session),
      shotsAgainstPlayer: getOpponentShotsAgainstPlayer(playerId)(
        session.shots,
      ),
      wins: getOpponentWins(session, playerId),
    },
  };
}

interface CreateGameOverStatePayload {
  winner: "player" | "opponent";
  session: SessionWithPlayers;
  playerId: string;
  lastShot: LastShot | null;
}

export function createGameOverState(
  payload: CreateGameOverStatePayload,
): GameOverState {
  const { winner, session, playerId, lastShot } = payload;
  return {
    status: "over",
    winner,
    lastShot,
    session: {
      status: session.status,
    },
    player: {
      boats: getPlayerBoats(playerId)(session),
      shots: getPlayerShots(playerId)(session.shots),
      wins: getPlayerWins(session, playerId),
    },
    opponent: {
      sunkBoats: getSunkOpponentBoats(playerId)(session),
      shotsAgainstPlayer: getOpponentShotsAgainstPlayer(playerId)(
        session.shots,
      ),
      wins: getOpponentWins(session, playerId),
    },
  };
}

function areAllBoatsSunk(boats: Boat[]): boolean {
  return boats.length === TOTAL_BOATS_COUNT && boats.every(R.prop("sunk"));
}

function checkForWinner(
  session: SessionPlaying,
  opponentId: string,
): string | null {
  const opponentBoats = getPlayerBoats(opponentId)(session);

  if (areAllBoatsSunk(opponentBoats)) {
    return getOpponentId(session, opponentId);
  }

  return null;
}

interface BroadcastNextTurnResult {
  nextTurnPlayerId: string;
  opponentId: string;
  nextTurnState: GameInProgressState;
  opponentState: GameInProgressState;
}

export function buildNextTurnStates(
  session: SessionPlaying,
  nextTurnPlayerId: string,
  lastShot?: LastShot,
): BroadcastNextTurnResult {
  const opponentId = getOpponentId(session, nextTurnPlayerId);

  const nextTurnState = createInGameState({
    turn: "player",
    session,
    playerId: nextTurnPlayerId,
    lastShot: lastShot ?? null,
  });

  const opponentState = createInGameState({
    turn: "opponent",
    session,
    playerId: opponentId,
    lastShot: lastShot ?? null,
  });

  return {
    nextTurnPlayerId,
    opponentId,
    nextTurnState,
    opponentState,
  };
}

interface GameOverStatesResult {
  winnerId: string;
  loserId: string;
  winnerState: GameOverState;
  loserState: GameOverState;
}

export function buildGameOverStates(
  session: SessionGameOver,
  winnerId: string,
  lastShot: LastShot,
): GameOverStatesResult {
  const loserId = getOpponentId(session, winnerId);

  const winnerState = createGameOverState({
    winner: "player",
    session,
    playerId: winnerId,
    lastShot,
  });

  const loserState = createGameOverState({
    winner: "opponent",
    session,
    playerId: loserId,
    lastShot,
  });

  return { winnerId, loserId, winnerState, loserState };
}

interface HandleNextTurnPayload {
  db: D1Database;
  sessionId: string;
  playerId: string;
  opponentId: string;
  lastShot: LastShot;
}

interface HandleNextTurnResult {
  session: SessionPlaying;
  nextTurnPlayerId: string;
  states: BroadcastNextTurnResult;
}

export async function handleNextTurn(
  payload: HandleNextTurnPayload,
): Promise<HandleNextTurnResult> {
  const { db, sessionId, playerId, opponentId, lastShot } = payload;

  const nextTurnPlayerId = determineNextTurnPlayer(
    playerId,
    opponentId,
    lastShot,
  );

  const updatedSession: SessionPlaying = await SessionService.setCurrentTurn({
    db,
    sessionId,
    playerId: nextTurnPlayerId,
  });

  const states = buildNextTurnStates(
    updatedSession,
    nextTurnPlayerId,
    lastShot,
  );

  return { session: updatedSession, nextTurnPlayerId, states };
}

interface HandleGameOverPayload {
  db: D1Database;
  sessionId: string;
  winnerId: string;
  lastShot: LastShot;
}

interface HandleGameOverResult {
  session: SessionGameOver;
  states: GameOverStatesResult;
}

export async function handleGameOver(
  payload: HandleGameOverPayload,
): Promise<HandleGameOverResult> {
  const { db, sessionId, winnerId, lastShot } = payload;

  const gameOverSession = await SessionService.setWinner({
    db,
    sessionId,
    winnerId,
  });

  const states = buildGameOverStates(gameOverSession, winnerId, lastShot);

  return { session: gameOverSession, states };
}

interface HandleShotFiredPayload {
  db: D1Database;
  playerId: string;
  x: number;
  y: number;
}

type ShotFiredResult =
  | { type: "next_turn"; result: HandleNextTurnResult }
  | { type: "game_over"; result: HandleGameOverResult };

export async function handleShotFired(
  payload: HandleShotFiredPayload,
): Promise<ShotFiredResult> {
  const { db, playerId, x, y } = payload;
  const coordinates: Coordinates = { x, y };

  const session = await SessionService.getSessionByPlayerId({ db, playerId });
  if (!isSessionPlaying(session)) {
    throw new InvalidGameStateError();
  }

  validatePlayerTurn(session, playerId);

  const shot: LastShot = await ShotService.registerShot({
    db,
    sessionId: session.id,
    playerId,
    coordinates,
  });

  return processAfterShotEffects({ db, playerId, shot });
}

interface ProcessAfterShotEffectsPayload {
  db: D1Database;
  playerId: string;
  shot: LastShot;
}

async function processAfterShotEffects(
  payload: ProcessAfterShotEffectsPayload,
): Promise<ShotFiredResult> {
  const { db, playerId, shot } = payload;

  const session = await SessionService.getSessionByPlayerId({ db, playerId });
  if (!isSessionPlaying(session)) {
    throw new InvalidGameStateError();
  }

  const opponentId = getOpponentId(session, playerId);
  const winnerId = checkForWinner(session, opponentId);

  if (winnerId) {
    const result = await handleGameOver({
      db,
      sessionId: session.id,
      winnerId,
      lastShot: shot,
    });
    return { type: "game_over", result };
  }

  const result = await handleNextTurn({
    db,
    sessionId: session.id,
    playerId,
    opponentId,
    lastShot: shot,
  });
  return { type: "next_turn", result };
}

function pickRandom([a, b]: [string, string]): string {
  return Math.random() < COIN_FLIP_THRESHOLD ? a : b;
}

interface StartGamePayload {
  db: D1Database;
  sessionId: string;
  ownerId: string;
  friendId: string;
}

interface StartGameResult {
  session: SessionPlaying;
  states: BroadcastNextTurnResult;
}

export async function startGame(
  payload: StartGamePayload,
): Promise<StartGameResult> {
  const { db, sessionId, ownerId, friendId } = payload;
  const firstPlayerId: string = pickRandom([ownerId, friendId]);

  const updatedSession: SessionPlaying = await SessionService.setCurrentTurn({
    db,
    sessionId,
    playerId: firstPlayerId,
  });

  const states = buildNextTurnStates(updatedSession, firstPlayerId);

  return { session: updatedSession, states };
}

interface HandlePlaceBoatsPayload {
  db: D1Database;
  playerId: string;
  boats: Array<{
    id: string;
    startX: number;
    startY: number;
    length: number;
    orientation: "horizontal" | "vertical";
  }>;
}

type PlaceBoatsResult =
  | { type: "waiting"; session: Session }
  | { type: "game_started"; result: StartGameResult };

export async function handlePlaceBoats(
  payload: HandlePlaceBoatsPayload,
): Promise<PlaceBoatsResult> {
  const { db, playerId, boats } = payload;

  await BoatService.saveBoats({
    db,
    playerId,
    boats,
  });

  const session: Session = await SessionService.getSessionByPlayerId({
    db,
    playerId,
  });

  if (session.status === "ready_to_start") {
    const result = await startGame({
      db,
      sessionId: session.id,
      ownerId: session.owner.id,
      friendId: session.friend.id,
    });
    return { type: "game_started", result };
  }

  return { type: "waiting", session };
}

interface HandleRequestNewGamePayload {
  db: D1Database;
  playerId: string;
}

interface HandleRequestNewGameResult {
  session: SessionWaitingForBoats;
  messageData: NewGameStartedMessage["data"];
}

export async function handleRequestNewGame(
  payload: HandleRequestNewGamePayload,
): Promise<HandleRequestNewGameResult> {
  const { db, playerId } = payload;

  const resetSession: SessionWaitingForBoats =
    await SessionService.resetSessionForPlayer({ db, playerId });

  const messageData: NewGameStartedMessage["data"] = {
    session: {
      status: resetSession.status,
    },
  };

  return { session: resetSession, messageData };
}
