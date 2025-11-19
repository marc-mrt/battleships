import * as BoatDB from '../database/boat';
import { Boat } from '../models/boat';
import { Coordinates } from '../models/coordinates';

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

export async function saveBoats(payload: SaveBoatsPayload): Promise<void> {
	const { playerId, boats } = payload;
	await BoatDB.saveBoats({
		playerId,
		boats,
	});
}

export async function markBoatAsSunk(boatId: string): Promise<void> {
	await BoatDB.markBoatAsSunk(boatId);
}

export function isCoordinateOnBoat(coordinates: Coordinates) {
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
