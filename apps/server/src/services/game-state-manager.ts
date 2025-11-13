import { Session, SessionInGame } from '../models/session';
import { GameState, LastShot } from 'game-messages';
import { sendNextTurnMessage } from '../controllers/websocket.ts';
import * as BoatDB from '../database/boat.ts';
import * as SessionDB from '../database/session.ts';
import * as ShotDB from '../database/shot';
import { Boat } from '../models/boat';
import { Coordinates, Shot } from '../models/shot';
import * as R from 'ramda';

function validateSessionInGame(session: Session): SessionInGame {
	if (session.status !== 'in_game') {
		throw new Error('Game not in progress');
	}
	return session;
}

interface ValidatePlayerTurnPayload {
	session: SessionInGame;
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
	session: SessionInGame;
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
	session: SessionInGame;
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
	session: SessionInGame;
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
	return function extractBoats(session: SessionInGame): Boat[] {
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
	return function filterBoats(session: SessionInGame): Boat[] {
		const opponentBoats = playerId === session.owner.id ? session.friendBoats : session.ownerBoats;
		return opponentBoats.filter(R.prop('sunk'));
	};
}

export interface CreateGameStatePayload {
	turn: GameState['turn'];
	session: SessionInGame;
	playerId: string;
	lastShot: LastShot | null;
}

export function createGameState(payload: CreateGameStatePayload): GameState {
	const { turn, session, playerId, lastShot } = payload;
	return {
		turn,
		session: { status: session.status },
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

interface BroadcastNextTurnPayload {
	session: SessionInGame;
	nextTurnPlayerId: string;
	lastShot?: LastShot;
}

export function broadcastNextTurn(payload: BroadcastNextTurnPayload): void {
	const { session, nextTurnPlayerId, lastShot } = payload;
	const opponentId = getOpponentId({ session, playerId: nextTurnPlayerId });

	const nextTurnState = createGameState({
		turn: 'player_turn',
		session,
		playerId: nextTurnPlayerId,
		lastShot: lastShot ?? null,
	});

	const opponentState = createGameState({
		turn: 'opponent_turn',
		session,
		playerId: opponentId,
		lastShot: lastShot ?? null,
	});

	sendNextTurnMessage(nextTurnPlayerId, nextTurnState);
	sendNextTurnMessage(opponentId, opponentState);
}

interface HandleShotFiredPayload {
	session: Session;
	playerId: string;
	coordinates: Coordinates;
}

export async function handleShotFired(payload: HandleShotFiredPayload): Promise<void> {
	const { session, playerId, coordinates } = payload;
	const gameSession = validateSessionInGame(session);
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
		await BoatDB.markBoatAsSunk(result.boatId);
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

	const lastShot: LastShot = {
		...shot,
		sunkBoat: result.hit && result.sunk,
	};

	broadcastNextTurn({
		session: updatedSession,
		nextTurnPlayerId,
		lastShot,
	});
}
