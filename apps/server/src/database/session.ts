import { Session } from '../models/session';
import { query } from './db';
import { z } from 'zod';
import { generateMapperToDomainModel } from './mapper';

interface CreateSessionPayload {
	owner: { playerId: string };
}

export async function createSession(payload: CreateSessionPayload): Promise<Session> {
	const { playerId } = payload.owner;

	const result = await query(
		`
		WITH new_session AS (
			INSERT INTO sessions (owner_id) VALUES ($1)
			RETURNING *
		)
		SELECT
			s.*,
			o.id AS owner_id,
			o.username AS owner_username
		FROM new_session s
		JOIN players o ON s.owner_id = o.id
	`,
		[playerId],
	);

	return mapToSession(result.rows[0]);
}

const SessionDatabaseSchema = z.object({
	id: z.string(),
	owner_id: z.string(),
	owner_username: z.string(),
	friend_id: z.string().optional().nullable(),
	friend_username: z.string().optional().nullable(),
});

const mapper = (parsed: z.infer<typeof SessionDatabaseSchema>): Session => ({
	id: parsed.id,
	owner: {
		id: parsed.owner_id,
		username: parsed.owner_username,
	},
	friend:
		parsed.friend_id && parsed.friend_username
			? { id: parsed.friend_id, username: parsed.friend_username }
			: null,
});

const mapToSession = generateMapperToDomainModel(SessionDatabaseSchema, mapper);
