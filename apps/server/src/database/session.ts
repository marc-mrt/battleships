import * as crypto from 'node:crypto';
import type { Session } from '../models/session';
import { query } from './db';
import { z } from 'zod';
import { generateMapperToDomainModel } from './mapper';

interface CreateSessionPayload {
	owner: { playerId: string };
}

function generateSlug(prefix = 's') {
	const id = crypto.randomBytes(3).toString('hex');
	return `${prefix}_${id}`;
}

export async function createSession(payload: CreateSessionPayload): Promise<Session> {
	const { playerId } = payload.owner;
	const slug = generateSlug();

	const result = await query(
		`
			WITH new_session AS (
			INSERT
			INTO sessions (slug, owner_id)
			VALUES ($1, $2)
				RETURNING *
				)
			SELECT s.*,
						 o.id       AS owner_id,
						 o.username AS owner_username
			FROM new_session s
						 JOIN players o ON s.owner_id = o.id
		`,
		[slug, playerId],
	);

	return mapToSession(result.rows[0]);
}

interface JoinSessionPayload {
	slug: string;
	friend: { playerId: string };
}

export async function assignFriendToSession(payload: JoinSessionPayload): Promise<Session> {
	const {
		slug,
		friend: { playerId },
	} = payload;

	const result = await query(
		`
			WITH updated_session AS (
			UPDATE sessions
			SET friend_id = $2
			WHERE slug = $1 RETURNING *
			)
			SELECT s.*,
						 o.id       AS owner_id,
						 o.username AS owner_username,
						 f.id       AS friend_id,
						 f.username AS friend_username
			FROM updated_session s
						 JOIN players o ON s.owner_id = o.id
						 JOIN players f ON s.friend_id = f.id
		`,
		[slug, playerId],
	);

	return mapToSession(result.rows[0]);
}

export async function getSessionByPlayerId(playerId: string): Promise<Session | null> {
	const result = await query(
		`
			SELECT s.*,
						 owner_player.id                        AS owner_id,
						 owner_player.username                  AS owner_username,
						 (SELECT json_agg(json_build_object('id', b.id, 'start_x', b.start_x, 'start_y', b.start_y, 'length',
																								b.length,
																								'orientation', b.orientation))
							FROM boat_placements b
							WHERE owner_player.id = b.player_id)  AS owner_boat_placements,
						 friend_player.id                       AS friend_id,
						 friend_player.username                 AS friend_username,
						 (SELECT json_agg(json_build_object('id', b.id, 'start_x', b.start_x, 'start_y', b.start_y, 'length',
																								b.length,
																								'orientation', b.orientation))
							FROM boat_placements b
							WHERE friend_player.id = b.player_id) AS friend_boat_placements
			FROM sessions s
						 JOIN players owner_player ON s.owner_id = owner_player.id
						 LEFT JOIN players friend_player ON s.friend_id = friend_player.id
			WHERE s.owner_id = $1
				 OR s.friend_id = $1;
		`,
		[playerId],
	);

	if (result.rows.length === 0) {
		return null;
	}

	return mapToSession(result.rows[0]);
}

const BoatPlacementDatabaseSchema = z.object({
	id: z.string(),
	start_x: z.number(),
	start_y: z.number(),
	length: z.number(),
	orientation: z.enum(['horizontal', 'vertical']),
});

const SessionDatabaseSchema = z.object({
	id: z.string(),
	slug: z.string(),
	owner_id: z.string(),
	owner_username: z.string(),
	owner_boat_placements: z.array(BoatPlacementDatabaseSchema).optional().nullable(),
	friend_id: z.string().optional().nullable(),
	friend_username: z.string().optional().nullable(),
	friend_boat_placements: z.array(BoatPlacementDatabaseSchema).optional().nullable(),
});

function mapper(parsed: z.infer<typeof SessionDatabaseSchema>): Session {
	if (parsed.friend_id == null || parsed.friend_username == null) {
		return {
			id: parsed.id,
			slug: parsed.slug,
			status: 'waiting_for_friend',
			owner: {
				id: parsed.owner_id,
				username: parsed.owner_username,
			},
			friend: null,
		};
	} else {
		return {
			id: parsed.id,
			slug: parsed.slug,
			status:
				parsed.owner_boat_placements == null || parsed.friend_boat_placements == null
					? 'waiting_for_boat_placements'
					: 'ready_to_play',
			owner: {
				id: parsed.owner_id,
				username: parsed.owner_username,
			},
			friend: { id: parsed.friend_id, username: parsed.friend_username },
		};
	}
}

const mapToSession = generateMapperToDomainModel(SessionDatabaseSchema, mapper);
