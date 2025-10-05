import { Player } from '../models/player';
import { query } from './db';
import { z } from 'zod';
import { generateMapperToDomainModel } from './mapper';

interface CreatePlayerPayload {
	username: string;
}
export async function createPlayer(payload: CreatePlayerPayload): Promise<Player> {
	const { username } = payload;
	const result = await query('INSERT INTO players (username) VALUES ($1) RETURNING *', [username]);

	return mapToPlayer(result.rows[0]);
}

const PlayerDatabaseSchema = z.object({
	id: z.string(),
	username: z.string(),
});

const mapper = (parsed: z.infer<typeof PlayerDatabaseSchema>): Player => ({
	id: parsed.id,
	username: parsed.username,
});

const mapToPlayer = generateMapperToDomainModel(PlayerDatabaseSchema, mapper);
