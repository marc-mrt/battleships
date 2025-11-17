import { LastShot } from 'game-messages';
import * as BoatService from '../services/boat';
import { Shot } from '../models/shot';
import { Coordinates } from '../models/coordinates';
import { Boat } from '../models/boat';
import * as ShotDB from '../database/shot';
import { isSessionPlaying, SessionPlaying } from '../models/session';
import * as SessionService from '../services/session';
import { getOpponentId, getPlayerBoats } from './game-utils';

function isShotAtCoordinates(playerId: string, coordinates: Coordinates) {
	return function checkShot(shot: Shot): boolean {
		return shot.x === coordinates.x && shot.y === coordinates.y && shot.shooterId === playerId;
	};
}

function hasAlreadyShot(playerId: string, shots: Shot[], coordinates: Coordinates): boolean {
	return shots.some(isShotAtCoordinates(playerId, coordinates));
}

function isHitOnBoat(targetId: string, boat: Boat) {
	return function checkHit(shot: Shot): boolean {
		return (
			shot.hit &&
			shot.targetId === targetId &&
			BoatService.isCoordinateOnBoat({ x: shot.x, y: shot.y })(boat)
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

type ShotResult = { hit: false } | { hit: true; sunk: boolean; boatId: string };

function checkShotResult(
	session: SessionPlaying,
	opponentId: string,
	coordinates: Coordinates,
): ShotResult {
	const opponentBoats = getPlayerBoats(opponentId)(session);
	const hitBoat = opponentBoats.find(BoatService.isCoordinateOnBoat(coordinates));

	if (!hitBoat) {
		return { hit: false };
	}

	const previousHits = countPreviousHits({
		shots: session.shots,
		targetId: opponentId,
		boat: hitBoat,
	});
	const totalHits = previousHits + 1;
	const sunk = totalHits === hitBoat.length;

	return { hit: true, sunk, boatId: hitBoat.id };
}

export async function registerShot(
	sessionId: string,
	playerId: string,
	coordinates: Coordinates,
): Promise<LastShot> {
	const session = await SessionService.getSessionByPlayerId(playerId);
	if (!isSessionPlaying(session)) {
		throw new Error('Game not in progress');
	}

	if (hasAlreadyShot(playerId, session.shots, coordinates)) {
		throw new Error('Cannot shoot twice at the same coordinates');
	}

	const opponentId = getOpponentId(session, playerId);
	const result: ShotResult = checkShotResult(session, opponentId, coordinates);

	const shot = await ShotDB.recordShot({
		sessionId,
		shooterId: playerId,
		targetId: opponentId,
		x: coordinates.x,
		y: coordinates.y,
		hit: result.hit,
	});

	if (result.hit && result.sunk) {
		await BoatService.markBoatAsSunk(result.boatId);
	}

	const lastShot: LastShot = {
		...shot,
		sunkBoat: result.hit && result.sunk,
	};

	return lastShot;
}
