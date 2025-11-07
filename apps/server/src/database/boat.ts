import { query } from './db';
import { InvalidQueryPayloadError } from './errors.ts';
import { TOTAL_BOATS_COUNT } from 'game-rules';
import { z } from 'zod';
import { generateMapperToDomainModel } from './mapper.ts';
import { Boat } from '../models/boat.ts';

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
	if (payload.boats.length !== TOTAL_BOATS_COUNT) {
		throw new InvalidQueryPayloadError(
			`Need ${TOTAL_BOATS_COUNT} boats, got ${payload.boats.length}`,
		);
	}

	const { playerId } = payload;

	await deleteBoats(playerId);

	const { boats } = payload;
	const boatsConfiguration = boats.map((boat) => [
		boat.id,
		playerId,
		boat.startX,
		boat.startY,
		boat.length,
		boat.orientation,
	]);

	const valueRows = boatsConfiguration.map((row, rowIndex) => {
		const values = row.map((_, colIndex) => `$${row.length * rowIndex + 1 + colIndex}`);
		return `(${values.join(', ')})`;
	});

	const insertQuery = `
		INSERT INTO boats (id, player_id, start_x, start_y, length, orientation)
		VALUES ${valueRows.join(', ')}
	`;

	await query(insertQuery, boatsConfiguration.flat());
}

async function deleteBoats(playerId: string): Promise<void> {
	await query('DELETE FROM boats WHERE player_id = $1', [playerId]);
}

export async function markBoatAsSunk(boatId: string): Promise<Boat> {
	const result = await query('UPDATE boats SET sunk = TRUE WHERE id = $1 RETURNING *', [boatId]);
	return mapToBoat(result.rows[0]);
}

export async function getBoatsByPlayerId(playerId: string) {
	const result = await query('SELECT * FROM boats WHERE player_id = $1', [playerId]);
	return result.rows.map(mapToBoat);
}

export const BoatDatabaseSchema = z.object({
	id: z.string(),
	start_x: z.number(),
	start_y: z.number(),
	length: z.number(),
	orientation: z.enum(['horizontal', 'vertical']),
	sunk: z.boolean(),
});

const mapper = (parsed: z.infer<typeof BoatDatabaseSchema>): Boat => ({
	id: parsed.id,
	startX: parsed.start_x,
	startY: parsed.start_y,
	length: parsed.length,
	orientation: parsed.orientation,
	sunk: parsed.sunk,
});

export const mapToBoat = generateMapperToDomainModel(BoatDatabaseSchema, mapper);
