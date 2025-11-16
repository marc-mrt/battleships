import { Session, SessionPlaying, SessionGameOver } from '../models/session';
import { GameOverState, GameInProgressState, LastShot } from 'game-messages';
import { sendNextTurnMessage } from '../controllers/websocket.ts';
import * as SessionDB from '../database/session.ts';
import * as ShotDB from '../database/shot';
import * as BoatService from './boat.ts';
import { Boat } from '../models/boat';
import { Coordinates, Shot } from '../models/shot';
import * as R from 'ramda';
import { TOTAL_BOATS_COUNT } from 'game-rules';

const COIN_FLIP_PROBABILITY = 0.5;

function validateSessionPlaying(session: Session): SessionPlaying {
	if (session.status !== 'playing') {
		throw new Error('Game not in progress');
	}
	return session;
}

interface ValidatePlayerTurnPayload {
	session: SessionPlaying;
	playerId: string;
}

function validatePlayerTurn(payload: ValidatePlayerTurnPayload): void {
	const { session, playerId } = payload;
	if (session.currentTurn.id !== playerId) {
		throw new Error('Cannot shoot at this time');
	}
}

function isShotAtCoordinates(playerId: string, coordinates: Coordinates) {
	return function checkShot(shot: Shot): boolean {
		return shot.x === coordinates.x && shot.y === coordinates.y && shot.shooterId === playerId;
	};
}

interface HasAlreadyShotPayload {
	shots: Shot[];
	playerId: string;
	coordinates: Coordinates;
}

function hasAlreadyShot(payload: HasAlreadyShotPayload): boolean {
	const { shots, playerId, coordinates } = payload;
	return shots.some(isShotAtCoordinates(playerId, coordinates));
}

interface GetOpponentIdPayload {
	session: SessionPlaying;
	playerId: string;
}

function getOpponentId(payload: GetOpponentIdPayload): string {
	const { session, playerId } = payload;
	return playerId === session.owner.id ? session.friend.id : session.owner.id;
}

function isCoordinateOnBoat(coordinates: Coordinates) {
	return function checkBoat(boat: Boat): boolean {
		const { x, y } = coordinates;
		if (boat.orientation === 'horizontal') {
			return y === boat.startY && x >= boat.startX && x < boat.startX + boat.length;
		}
		if (boat.orientation === 'vertical') {
			return x === boat.startX && y >= boat.startY && y < boat.startY + boat.length;
		}
		return false;
	};
}

interface GetTargetBoatsPayload {
	session: SessionPlaying;
	targetId: string;
}

function getTargetBoats(payload: GetTargetBoatsPayload): Boat[] {
	const { session, targetId } = payload;
	return session.owner.id === targetId ? session.ownerBoats : session.friendBoats;
}

function isHitOnBoat(targetId: string, boat: Boat) {
	return function checkHit(shot: Shot): boolean {
		return (
			shot.hit && shot.targetId === targetId && isCoordinateOnBoat({ x: shot.x, y: shot.y })(boat)
		);
	};
}

interface CountPreviousHitsPayload {
	shots: Shot[];
	targetId: string;
	boat: Boat;
}

function countPreviousHits(payload: CountPreviousHitsPayload): number {
	const { shots, targetId, boat } = payload;
	return shots.filter(isHitOnBoat(targetId, boat)).length;
}

interface CheckShotResultPayload {
	session: SessionPlaying;
	targetId: string;
	coordinates: Coordinates;
}

function checkShotResult(
	payload: CheckShotResultPayload,
): { hit: false } | { hit: true; sunk: boolean; boatId: string } {
	const { session, targetId, coordinates } = payload;
	const targetBoats = getTargetBoats({ session, targetId });
	const hitBoat = targetBoats.find(isCoordinateOnBoat(coordinates));

	if (!hitBoat) {
		return { hit: false };
	}

	const previousHits = countPreviousHits({ shots: session.shots, targetId, boat: hitBoat });
	const totalHits = previousHits + 1;
	const sunk = totalHits === hitBoat.length;

	return { hit: true, sunk, boatId: hitBoat.id };
}

interface RecordShotPayload {
	sessionId: string;
	shooterId: string;
	targetId: string;
	coordinates: Coordinates;
	hit: boolean;
}

async function recordShot(payload: RecordShotPayload): Promise<Shot> {
	const { sessionId, shooterId, targetId, coordinates, hit } = payload;
	return await ShotDB.recordShot({
		sessionId,
		shooterId,
		targetId,
		x: coordinates.x,
		y: coordinates.y,
		hit,
	});
}

interface DetermineNextTurnPlayerPayload {
	shooterId: string;
	targetId: string;
	result: { hit: boolean; sunk?: boolean };
}

function determineNextTurnPlayer(payload: DetermineNextTurnPlayerPayload): string {
	const { shooterId, targetId, result } = payload;
	if (!result.hit) {
		return targetId;
	}
	if (result.sunk) {
		return targetId;
	}
	return shooterId;
}

function getPlayerBoats(playerId: string) {
	return function extractBoats(session: SessionPlaying | SessionGameOver): Boat[] {
		return playerId === session.owner.id ? session.ownerBoats : session.friendBoats;
	};
}

function isShooter(playerId: string) {
	return R.propEq(playerId, 'shooterId');
}

function isTarget(playerId: string) {
	return R.propEq(playerId, 'targetId');
}

function getPlayerShots(playerId: string) {
	return function filterShots(shots: Shot[]): Shot[] {
		return shots.filter(isShooter(playerId));
	};
}

function getOpponentShotsAgainstPlayer(playerId: string) {
	return function filterShots(shots: Shot[]): Shot[] {
		return shots.filter(isTarget(playerId));
	};
}

function getSunkOpponentBoats(playerId: string) {
	return function filterBoats(session: SessionPlaying | SessionGameOver): Boat[] {
		const opponentBoats = playerId === session.owner.id ? session.friendBoats : session.ownerBoats;
		return opponentBoats.filter(R.prop('sunk'));
	};
}

interface CreateInGameStatePayload {
	turn: 'player' | 'opponent';
	session: SessionPlaying;
	playerId: string;
	lastShot: LastShot | null;
}

function createInGameState(payload: CreateInGameStatePayload): GameInProgressState {
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

function createGameOverState(payload: CreateGameOverStatePayload): GameOverState {
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

export function createInGameStateForPlayer(payload: CreateInGameStatePayload): GameInProgressState {
	return createInGameState(payload);
}

export function createGameOverStateForPlayer(payload: CreateGameOverStatePayload): GameOverState {
	return createGameOverState(payload);
}

function areAllBoatsSunk(boats: Boat[]): boolean {
	return boats.length === TOTAL_BOATS_COUNT && boats.every(R.prop('sunk'));
}

interface CheckForWinnerPayload {
	session: SessionPlaying;
	targetId: string;
}

function checkForWinner(payload: CheckForWinnerPayload): string | null {
	const { session, targetId } = payload;
	const targetBoats = getTargetBoats({ session, targetId });

	if (areAllBoatsSunk(targetBoats)) {
		return getOpponentId({ session, playerId: targetId });
	}

	return null;
}

interface BroadcastNextTurnPayload {
	session: SessionPlaying;
	nextTurnPlayerId: string;
	lastShot?: LastShot;
}

export function broadcastNextTurn(payload: BroadcastNextTurnPayload): void {
	const { session, nextTurnPlayerId, lastShot } = payload;
	const opponentId = getOpponentId({ session, playerId: nextTurnPlayerId });

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

interface BroadcastGameOverPayload {
	session: Session;
	winnerId: string;
	lastShot: LastShot;
}

function broadcastGameOver(payload: BroadcastGameOverPayload): void {
	const { session, winnerId, lastShot } = payload;

	if (session.status !== 'playing') {
		throw new Error('Session must be in playing status');
	}

	const sessionInGameFormat: SessionPlaying = {
		...session,
		status: 'playing',
		currentTurn: { id: winnerId },
	};

	const loserId = getOpponentId({
		session: sessionInGameFormat,
		playerId: winnerId,
	});

	const winnerState = createGameOverState({
		winner: 'player',
		session: sessionInGameFormat,
		playerId: winnerId,
		lastShot,
	});

	const loserState = createGameOverState({
		winner: 'opponent',
		session: sessionInGameFormat,
		playerId: loserId,
		lastShot,
	});

	sendNextTurnMessage(winnerId, winnerState);
	sendNextTurnMessage(loserId, loserState);
}

interface HandleShotFiredPayload {
	session: Session;
	playerId: string;
	coordinates: Coordinates;
}

export async function handleShotFired(payload: HandleShotFiredPayload): Promise<void> {
	const { session, playerId, coordinates } = payload;
	const gameSession = validateSessionPlaying(session);
	validatePlayerTurn({ session: gameSession, playerId });

	if (hasAlreadyShot({ shots: gameSession.shots, playerId, coordinates })) {
		throw new Error('Cannot shoot twice at the same coordinates');
	}

	const targetId = getOpponentId({ session: gameSession, playerId });
	const result = checkShotResult({ session: gameSession, targetId, coordinates });

	const shot = await recordShot({
		sessionId: gameSession.id,
		shooterId: playerId,
		targetId,
		coordinates,
		hit: result.hit,
	});

	if (result.hit && result.sunk) {
		await BoatService.markBoatAsSunk(result.boatId);
	}

	const lastShot: LastShot = {
		...shot,
		sunkBoat: result.hit && result.sunk,
	};

	const updatedSessionAfterShot = await SessionDB.getSessionByPlayerId(playerId);
	if (!updatedSessionAfterShot || updatedSessionAfterShot.status !== 'playing') {
		throw new Error('Session not found or not in game');
	}

	const winnerId = checkForWinner({
		session: updatedSessionAfterShot,
		targetId,
	});

	if (winnerId) {
		const gameOverSession = await SessionDB.setWinner({
			sessionId: gameSession.id,
			winnerId,
		});

		broadcastGameOver({
			session: gameOverSession,
			winnerId,
			lastShot,
		});

		return;
	}

	const nextTurnPlayerId = determineNextTurnPlayer({
		shooterId: playerId,
		targetId,
		result,
	});

	const updatedSession = await SessionDB.setCurrentTurn({
		sessionId: gameSession.id,
		playerId: nextTurnPlayerId,
	});

	broadcastNextTurn({
		session: updatedSession,
		nextTurnPlayerId,
		lastShot,
	});
}

interface DetermineFirstPlayerPayload {
	ownerId: string;
	friendId: string;
}

function determineFirstPlayer(payload: DetermineFirstPlayerPayload): string {
	const { ownerId, friendId } = payload;
	return Math.random() < COIN_FLIP_PROBABILITY ? ownerId : friendId;
}

interface StartGamePayload {
	sessionId: string;
	ownerId: string;
	friendId: string;
}

export async function startGame(payload: StartGamePayload): Promise<void> {
	const { sessionId, ownerId, friendId } = payload;
	const firstPlayerId = determineFirstPlayer({ ownerId, friendId });

	const updatedSession: SessionPlaying = await SessionDB.setCurrentTurn({
		sessionId,
		playerId: firstPlayerId,
	});

	broadcastNextTurn({
		session: updatedSession,
		nextTurnPlayerId: firstPlayerId,
	});
}

interface SaveBoatsPayload {
	playerId: string;
	boats: Array<{
		id: string;
		startX: number;
		startY: number;
		length: number;
		orientation: 'horizontal' | 'vertical';
	}>;
}

export async function saveBoatsAndCheckGameStart(payload: SaveBoatsPayload): Promise<void> {
	const { playerId, boats } = payload;
	await BoatService.saveBoats({
		playerId,
		boats,
	});
}
