import * as crypto from 'node:crypto';
import type {
	Session,
	SessionCreated,
	SessionPlaying,
	SessionGameOver,
	SessionReadyToStart,
	SessionWaitingForBoats,
} from '../models/session';
import { query } from './db';
import { z } from 'zod';
import { generateMapperToDomainModel } from './mapper';
import { BoatDatabaseSchema, mapToBoat } from './boat';
import { mapToShot, ShotDatabaseSchema } from './shot.ts';
import { RecordNotFoundError, UnexpectedDatabaseError } from './errors.ts';

interface CreateSessionPayload {
	owner: { playerId: string };
}

const SESSION_SLUG_PREFIX = 's';
const SESSION_SLUG_BYTE_LENGTH = 3;

function generateSlug(prefix: string = SESSION_SLUG_PREFIX): string {
	const id = crypto.randomBytes(SESSION_SLUG_BYTE_LENGTH).toString('hex');
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

export async function assignFriendToSession(
	payload: JoinSessionPayload,
): Promise<SessionWaitingForBoats> {
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

	const session: Session = mapToSession(result.rows[0]);
	if (session.status !== 'waiting_for_boat_placements') {
		throw new UnexpectedDatabaseError(
			`Session is in unexpected '${session.status}' status: ${slug}`,
		);
	}
	return session;
}

interface SetCurrentTurnPayload {
	sessionId: string;
	playerId: string;
}

function buildFullSessionSelectQuery(source: string, whereClause?: string): string {
	return `
		SELECT s.*,
					 owner_player.id                        AS owner_id,
					 owner_player.username                  AS owner_username,
					 (SELECT json_agg(json_build_object('id', b.id, 'start_x', b.start_x, 'start_y', b.start_y, 'length',
																							b.length,
																							'orientation', b.orientation, 'sunk', b.sunk))
						FROM boats b
						WHERE owner_player.id = b.player_id)  AS owner_boats,
					 friend_player.id                       AS friend_id,
					 friend_player.username                 AS friend_username,
					 (SELECT json_agg(json_build_object('id', b.id, 'start_x', b.start_x, 'start_y', b.start_y, 'length',
																							b.length,
																							'orientation', b.orientation, 'sunk', b.sunk))
						FROM boats b
						WHERE friend_player.id = b.player_id) AS friend_boats,
					 (SELECT json_agg(json_build_object('id', shots.id, 'created_at', shots.created_at, 'shooter_id', shots.shooter_id, 'target_id',
																							shots.target_id,
																							'x', shots.x, 'y', shots.y, 'hit', shots.hit))
						FROM shots
						WHERE shots.session_id = s.id)        AS shots
		FROM ${source} s
  		JOIN players owner_player ON s.owner_id = owner_player.id
      LEFT JOIN players friend_player ON s.friend_id = friend_player.id
    ${whereClause || ''}
	`;
}

export async function setCurrentTurn(payload: SetCurrentTurnPayload): Promise<SessionPlaying> {
	const { sessionId, playerId } = payload;

	const result = await query(
		`
			WITH updated_session AS (
  			UPDATE sessions
  			SET current_turn_id = $1
  			WHERE id = $2 RETURNING *
			)
			${buildFullSessionSelectQuery('updated_session')}
		`,
		[playerId, sessionId],
	);

	if (result.rows.length === 0) {
		throw new RecordNotFoundError(`Session not found: ${sessionId}`);
	}

	const session: Session = mapToSession(result.rows[0]);
	if (session.status !== 'playing') {
		throw new UnexpectedDatabaseError(
			`Session is in unexpected '${session.status}' status: ${sessionId}`,
		);
	}

	return session;
}

interface SetWinnerPayload {
	sessionId: string;
	winnerId: string;
}

export async function setWinner(payload: SetWinnerPayload): Promise<Session> {
	const { sessionId, winnerId } = payload;

	const result = await query(
		`
			WITH updated_session AS (
  			UPDATE sessions
  			SET winner_id = $1, current_turn_id = NULL
  			WHERE id = $2 RETURNING *
			)
			${buildFullSessionSelectQuery('updated_session')}
		`,
		[winnerId, sessionId],
	);

	if (result.rows.length === 0) {
		throw new RecordNotFoundError(`Session not found: ${sessionId}`);
	}

	return mapToSession(result.rows[0]);
}

export async function resetSessionToBoatPlacement(
	sessionId: string,
): Promise<SessionWaitingForBoats> {
	await query(
		'DELETE FROM boats WHERE player_id IN (SELECT owner_id FROM sessions WHERE id = $1 UNION SELECT friend_id FROM sessions WHERE id = $1)',
		[sessionId],
	);
	await query('DELETE FROM shots WHERE session_id = $1', [sessionId]);

	const result = await query(
		`
			WITH updated_session AS (
				UPDATE sessions
				SET winner_id = NULL, current_turn_id = NULL
				WHERE id = $1
				RETURNING *
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
		[sessionId],
	);

	if (result.rows.length === 0) {
		throw new RecordNotFoundError(`Session not found: ${sessionId}`);
	}

	const session: Session = mapToSession(result.rows[0]);
	if (session.status !== 'waiting_for_boat_placements') {
		throw new UnexpectedDatabaseError(
			`Session is in unexpected '${session.status}' status after reset: ${sessionId}`,
		);
	}

	return session;
}

export async function getSessionByPlayerId(playerId: string): Promise<Session | null> {
	const result = await query(
		buildFullSessionSelectQuery('sessions', 'WHERE s.owner_id = $1 OR s.friend_id = $1'),
		[playerId],
	);

	if (result.rows.length === 0) {
		return null;
	}

	return mapToSession(result.rows[0]);
}

const SessionDatabaseSchema = z.object({
	id: z.string(),
	slug: z.string(),
	owner_id: z.string(),
	owner_username: z.string(),
	owner_boats: z.array(BoatDatabaseSchema).optional().nullable(),
	friend_id: z.string().optional().nullable(),
	friend_username: z.string().optional().nullable(),
	friend_boats: z.array(BoatDatabaseSchema).optional().nullable(),
	current_turn_id: z.string().optional().nullable(),
	winner_id: z.string().optional().nullable(),
	shots: z.array(ShotDatabaseSchema).optional().nullable(),
});

function hasFriend(parsed: z.infer<typeof SessionDatabaseSchema>): boolean {
	return parsed.friend_id != null && parsed.friend_username != null;
}

function hasBoatPlacements(parsed: z.infer<typeof SessionDatabaseSchema>): boolean {
	return parsed.owner_boats != null && parsed.friend_boats != null;
}

function hasCurrentTurnSet(parsed: z.infer<typeof SessionDatabaseSchema>): boolean {
	return parsed.current_turn_id != null;
}

function createBaseSession(parsed: z.infer<typeof SessionDatabaseSchema>) {
	return {
		id: parsed.id,
		slug: parsed.slug,
		owner: {
			id: parsed.owner_id,
			username: parsed.owner_username,
		},
	};
}

function createFriendData(parsed: z.infer<typeof SessionDatabaseSchema>) {
	return {
		id: parsed.friend_id!,
		username: parsed.friend_username!,
	};
}

function mapToWaitingForFriend(parsed: z.infer<typeof SessionDatabaseSchema>): SessionCreated {
	return {
		...createBaseSession(parsed),
		status: 'waiting_for_friend',
	};
}

function mapToWaitingForBoatPlacements(
	parsed: z.infer<typeof SessionDatabaseSchema>,
): SessionWaitingForBoats {
	return {
		...createBaseSession(parsed),
		status: 'waiting_for_boat_placements',
		friend: createFriendData(parsed),
	};
}

function mapToReadyToStart(parsed: z.infer<typeof SessionDatabaseSchema>): SessionReadyToStart {
	return {
		...createBaseSession(parsed),
		status: 'ready_to_start',
		friend: createFriendData(parsed),
	};
}

function mapToPlaying(parsed: z.infer<typeof SessionDatabaseSchema>): SessionPlaying {
	return {
		...createBaseSession(parsed),
		status: 'playing',
		ownerBoats: parsed.owner_boats?.map(mapToBoat) ?? [],
		friend: createFriendData(parsed),
		friendBoats: parsed.friend_boats?.map(mapToBoat) ?? [],
		currentTurn: { id: parsed.current_turn_id! },
		shots: parsed.shots?.map(mapToShot) ?? [],
	};
}

function mapToGameOver(parsed: z.infer<typeof SessionDatabaseSchema>): SessionGameOver {
	return {
		...mapToPlaying(parsed),
		winner: { id: parsed.winner_id! },
	};
}

function hasWinner(parsed: z.infer<typeof SessionDatabaseSchema>): boolean {
	return parsed.winner_id != null;
}

function mapper(parsed: z.infer<typeof SessionDatabaseSchema>): Session {
	if (!hasFriend(parsed)) {
		return mapToWaitingForFriend(parsed);
	}
	if (!hasBoatPlacements(parsed)) {
		return mapToWaitingForBoatPlacements(parsed);
	}
	if (hasWinner(parsed)) {
		return mapToGameOver(parsed);
	}
	if (!hasCurrentTurnSet(parsed)) {
		return mapToReadyToStart(parsed);
	}
	return mapToPlaying(parsed);
}

const mapToSession = generateMapperToDomainModel({
	schema: SessionDatabaseSchema,
	mapper,
});
