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

function validatePlayerTurn(session: SessionInGame, playerId: string): void {
	if (session.currentTurn.id !== playerId) {
		throw new Error('Cannot shoot at this time');
	}
}

function hasAlreadyShot(shots: Shot[], playerId: string, coordinates: Coordinates): boolean {
	return shots.some(
		(shot) => shot.x === coordinates.x && shot.y === coordinates.y && shot.shooterId === playerId,
	);
}

function getOpponentId(session: SessionInGame, playerId: string): string {
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

function getTargetBoats(session: SessionInGame, targetId: string): Boat[] {
	return session.owner.id === targetId ? session.ownerBoats : session.friendBoats;
}

function countPreviousHits(shots: Shot[], targetId: string, boat: Boat): number {
	const isHitOnBoat = (shot: Shot): boolean =>
		shot.hit && shot.targetId === targetId && isCoordinateOnBoat({ x: shot.x, y: shot.y })(boat);

	return shots.filter(isHitOnBoat).length;
}

function checkShotResult(
	session: SessionInGame,
	targetId: string,
	coordinates: Coordinates,
): { hit: false } | { hit: true; sunk: boolean; boatId: string } {
	const targetBoats = getTargetBoats(session, targetId);
	const hitBoat = targetBoats.find(isCoordinateOnBoat(coordinates));

	if (!hitBoat) {
		return { hit: false };
	}

	const previousHits = countPreviousHits(session.shots, targetId, hitBoat);
	const totalHits = previousHits + 1;
	const sunk = totalHits === hitBoat.length;

	return { hit: true, sunk, boatId: hitBoat.id };
}

async function recordShot(
	sessionId: string,
	shooterId: string,
	targetId: string,
	coordinates: Coordinates,
	hit: boolean,
): Promise<Shot> {
	return await ShotDB.recordShot({
		sessionId,
		shooterId,
		targetId,
		x: coordinates.x,
		y: coordinates.y,
		hit,
	});
}

function determineNextTurnPlayer(
	shooterId: string,
	targetId: string,
	result: { hit: boolean; sunk?: boolean },
): string {
	if (!result.hit) {
		return targetId;
	}
	if (result.sunk) {
		return targetId;
	}
	return shooterId;
}

function getPlayerBoats(session: SessionInGame, playerId: string): Boat[] {
	return playerId === session.owner.id ? session.ownerBoats : session.friendBoats;
}

function getPlayerShots(shots: Shot[], playerId: string): Shot[] {
	return shots.filter(R.propEq(playerId, 'shooterId'));
}

function getOpponentShotsAgainstPlayer(shots: Shot[], playerId: string): Shot[] {
	return shots.filter(R.propEq(playerId, 'targetId'));
}

function getSunkOpponentBoats(session: SessionInGame, playerId: string): Boat[] {
	const opponentBoats = playerId === session.owner.id ? session.friendBoats : session.ownerBoats;
	return opponentBoats.filter(R.prop('sunk'));
}

function createGameState(
	turn: GameState['turn'],
	session: SessionInGame,
	playerId: string,
	lastShot: LastShot | null,
): GameState {
	return {
		turn,
		session: { status: session.status },
		lastShot,
		player: {
			boats: getPlayerBoats(session, playerId),
			shots: getPlayerShots(session.shots, playerId),
		},
		opponent: {
			sunkBoats: getSunkOpponentBoats(session, playerId),
			shotsAgainstPlayer: getOpponentShotsAgainstPlayer(session.shots, playerId),
		},
	};
}

export function broadcastNextTurn(
	session: SessionInGame,
	nextTurnPlayerId: string,
	lastShot?: LastShot,
): void {
	const opponentId = getOpponentId(session, nextTurnPlayerId);

	const nextTurnState = createGameState('player_turn', session, nextTurnPlayerId, lastShot ?? null);

	const opponentState = createGameState('opponent_turn', session, opponentId, lastShot ?? null);

	sendNextTurnMessage(nextTurnPlayerId, nextTurnState);
	sendNextTurnMessage(opponentId, opponentState);
}

export async function handleShotFired(
	session: Session,
	playerId: string,
	coordinates: Coordinates,
): Promise<void> {
	const gameSession = validateSessionInGame(session);
	validatePlayerTurn(gameSession, playerId);

	if (hasAlreadyShot(gameSession.shots, playerId, coordinates)) {
		throw new Error('Cannot shoot twice at the same coordinates');
	}

	const targetId = getOpponentId(gameSession, playerId);
	const result = checkShotResult(gameSession, targetId, coordinates);

	const shot = await recordShot(gameSession.id, playerId, targetId, coordinates, result.hit);

	if (result.hit && result.sunk) {
		await BoatDB.markBoatAsSunk(result.boatId);
	}

	const nextTurnPlayerId = determineNextTurnPlayer(playerId, targetId, result);

	const updatedSession = await SessionDB.setCurrentTurn({
		sessionId: gameSession.id,
		playerId: nextTurnPlayerId,
	});

	const lastShot: LastShot = {
		...shot,
		sunkBoat: result.hit && result.sunk,
	};

	broadcastNextTurn(updatedSession, nextTurnPlayerId, lastShot);
}
