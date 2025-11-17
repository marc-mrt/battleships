import {
	SessionPlaying,
	SessionGameOver,
	SessionWaitingForBoats,
	Session,
	isSessionPlaying,
} from '../models/session';
import { GameOverState, GameInProgressState, LastShot, NewGameStartedMessage } from 'game-messages';
import { sendNewGameStartedMessage, sendNextTurnMessage } from '../controllers/websocket.ts';
import * as BoatService from './boat.ts';
import * as SessionService from './session.ts';
import * as ShotService from './shot.ts';
import { Boat } from '../models/boat';
import { Coordinates } from '../models/coordinates';
import * as R from 'ramda';
import { TOTAL_BOATS_COUNT } from 'game-rules';
import {
	determineNextTurnPlayer,
	getOpponentId,
	getOpponentShotsAgainstPlayer,
	getPlayerBoats,
	getPlayerShots,
	getSunkOpponentBoats,
	validatePlayerTurn,
} from './game-utils.ts';

const COIN_FLIP_PROBABILITY = 0.5;

interface CreateInGameStatePayload {
	turn: 'player' | 'opponent';
	session: SessionPlaying;
	playerId: string;
	lastShot: LastShot | null;
}

export function createInGameState(payload: CreateInGameStatePayload): GameInProgressState {
	const { turn, session, playerId, lastShot } = payload;
	return {
		status: 'in_progress',
		turn,
		lastShot,
		player: {
			boats: getPlayerBoats(playerId)(session),
			shots: getPlayerShots(playerId)(session.shots),
		},
		opponent: {
			sunkBoats: getSunkOpponentBoats(playerId)(session),
			shotsAgainstPlayer: getOpponentShotsAgainstPlayer(playerId)(session.shots),
		},
	};
}

interface CreateGameOverStatePayload {
	winner: 'player' | 'opponent';
	session: SessionPlaying | SessionGameOver;
	playerId: string;
	lastShot: LastShot | null;
}

export function createGameOverState(payload: CreateGameOverStatePayload): GameOverState {
	const { winner, session, playerId, lastShot } = payload;
	return {
		status: 'over',
		winner,
		lastShot,
		player: {
			boats: getPlayerBoats(playerId)(session),
			shots: getPlayerShots(playerId)(session.shots),
		},
		opponent: {
			sunkBoats: getSunkOpponentBoats(playerId)(session),
			shotsAgainstPlayer: getOpponentShotsAgainstPlayer(playerId)(session.shots),
		},
	};
}

function areAllBoatsSunk(boats: Boat[]): boolean {
	return boats.length === TOTAL_BOATS_COUNT && boats.every(R.prop('sunk'));
}

function checkForWinner(session: SessionPlaying, opponentId: string): string | null {
	const opponentBoats = getPlayerBoats(opponentId)(session);

	if (areAllBoatsSunk(opponentBoats)) {
		return getOpponentId(session, opponentId);
	}

	return null;
}

export function broadcastNextTurn(
	session: SessionPlaying,
	nextTurnPlayerId: string,
	lastShot?: LastShot,
): void {
	const opponentId = getOpponentId(session, nextTurnPlayerId);

	const nextTurnState = createInGameState({
		turn: 'player',
		session,
		playerId: nextTurnPlayerId,
		lastShot: lastShot ?? null,
	});

	const opponentState = createInGameState({
		turn: 'opponent',
		session,
		playerId: opponentId,
		lastShot: lastShot ?? null,
	});

	sendNextTurnMessage(nextTurnPlayerId, nextTurnState);
	sendNextTurnMessage(opponentId, opponentState);
}

function broadcastGameOver(session: SessionGameOver, winnerId: string, lastShot: LastShot): void {
	const loserId = getOpponentId(session, winnerId);

	const winnerState = createGameOverState({
		winner: 'player',
		session,
		playerId: winnerId,
		lastShot,
	});

	const loserState = createGameOverState({
		winner: 'opponent',
		session,
		playerId: loserId,
		lastShot,
	});

	sendNextTurnMessage(winnerId, winnerState);
	sendNextTurnMessage(loserId, loserState);
}

interface HandleNextTurnPayload {
	sessionId: string;
	playerId: string;
	opponentId: string;
	lastShot: LastShot;
}

async function handleNextTurn(payload: HandleNextTurnPayload): Promise<void> {
	const { sessionId, playerId, opponentId, lastShot } = payload;

	const nextTurnPlayerId = determineNextTurnPlayer(playerId, opponentId, lastShot);

	const updatedSession: SessionPlaying = await SessionService.setCurrentTurn(
		sessionId,
		nextTurnPlayerId,
	);

	broadcastNextTurn(updatedSession, nextTurnPlayerId, lastShot);
}

async function handleGameOver(
	sessionId: string,
	winnerId: string,
	lastShot: LastShot,
): Promise<void> {
	const gameOverSession = await SessionService.setWinner(sessionId, winnerId);
	broadcastGameOver(gameOverSession, winnerId, lastShot);
}

export async function handleShotFired(playerId: string, x: number, y: number): Promise<void> {
	const coordinates: Coordinates = { x, y };

	const session = await SessionService.getSessionByPlayerId(playerId);
	if (!isSessionPlaying(session)) {
		throw new Error('Game not in progress');
	}

	validatePlayerTurn(session, playerId);

	const shot: LastShot = await ShotService.registerShot(session.id, playerId, coordinates);

	await processAfterShotEffects(playerId, shot);
}

async function processAfterShotEffects(playerId: string, shot: LastShot): Promise<void> {
	const session = await SessionService.getSessionByPlayerId(playerId);
	if (!isSessionPlaying(session)) {
		throw new Error('Game not in progress');
	}

	const opponentId = getOpponentId(session, playerId);
	const winnerId = checkForWinner(session, opponentId);

	if (winnerId) {
		await handleGameOver(session.id, winnerId, shot);
	} else {
		await handleNextTurn({
			sessionId: session.id,
			playerId,
			opponentId,
			lastShot: shot,
		});
	}
}

function pickRandom([a, b]: [string, string]): string {
	return Math.random() < COIN_FLIP_PROBABILITY ? a : b;
}

interface StartGamePayload {
	sessionId: string;
	ownerId: string;
	friendId: string;
}

export async function startGame(payload: StartGamePayload): Promise<void> {
	const { sessionId, ownerId, friendId } = payload;
	const firstPlayerId: string = pickRandom([ownerId, friendId]);

	const updatedSession: SessionPlaying = await SessionService.setCurrentTurn(
		sessionId,
		firstPlayerId,
	);

	broadcastNextTurn(updatedSession, firstPlayerId);
}

export async function handlePlaceBoats(
	playerId: string,
	boats: Array<{
		id: string;
		startX: number;
		startY: number;
		length: number;
		orientation: 'horizontal' | 'vertical';
	}>,
): Promise<void> {
	await BoatService.saveBoats({
		playerId,
		boats,
	});

	const session: Session = await SessionService.getSessionByPlayerId(playerId);
	if (session.status === 'ready_to_start') {
		await startGame({
			sessionId: session.id,
			ownerId: session.owner.id,
			friendId: session.friend!.id,
		});
	}
}

export async function handleRequestNewGame(playerId: string): Promise<void> {
	const resetSession: SessionWaitingForBoats = await SessionService.resetSessionForPlayer(playerId);

	const messageData: NewGameStartedMessage['data'] = {
		session: {
			status: resetSession.status,
		},
	};

	sendNewGameStartedMessage(resetSession.owner.id, messageData);
	sendNewGameStartedMessage(resetSession.friend.id, messageData);
}
