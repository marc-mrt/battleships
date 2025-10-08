import { query } from './db';
import { InvalidQueryPayloadError } from './errors.ts';
import { TOTAL_BOATS } from 'game-rules';

interface SaveBoatPlacementsPayload {
	playerId: string;
	boats: Array<{
		id: string;
		startX: number;
		startY: number;
		length: number;
		orientation: 'horizontal' | 'vertical';
	}>;
}

export async function saveBoatPlacements(payload: SaveBoatPlacementsPayload): Promise<void> {
	if (payload.boats.length !== TOTAL_BOATS) {
		throw new InvalidQueryPayloadError(`Need ${TOTAL_BOATS} boats, got ${payload.boats.length}`);
	}

	const { playerId } = payload;

	await deleteBoatPlacements(playerId);

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
		INSERT INTO boat_placements (id, player_id, start_x, start_y, length, orientation)
		VALUES ${valueRows.join(', ')}
	`;

	await query(insertQuery, boatsConfiguration.flat());
}

async function deleteBoatPlacements(playerId: string): Promise<void> {
	await query('DELETE FROM boat_placements WHERE player_id = $1', [playerId]);
}
