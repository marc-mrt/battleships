import * as BoatDB from '../database/boat.ts';

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
