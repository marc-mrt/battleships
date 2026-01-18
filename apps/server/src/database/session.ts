import { z } from "zod";
import type { Player } from "../models/player";
import {
  isSessionPlaying,
  type Session,
  type SessionCreated,
  type SessionGameOver,
  type SessionPlaying,
  type SessionReadyToStart,
  type SessionWaitingForBoats,
} from "../models/session";
import { generateUUID } from "../utils/uuid";
import { BoatDatabaseSchema, mapToBoat } from "./boat";
import { query, run } from "./db";
import { RecordNotFoundError, UnexpectedDatabaseError } from "./errors";
import { generateMapperToDomainModel } from "./mapper";
import { mapToShot, ShotDatabaseSchema } from "./shot";

interface CreateSessionPayload {
  db: D1Database;
  owner: { playerId: string };
}

const SESSION_SLUG_PREFIX = "s";
const SESSION_SLUG_BYTE_LENGTH = 3;

function generateSlug(prefix: string = SESSION_SLUG_PREFIX): string {
  const bytes = new Uint8Array(SESSION_SLUG_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${id}`;
}

export async function createSession(
  payload: CreateSessionPayload,
): Promise<Session> {
  const { db, owner } = payload;
  const { playerId } = owner;
  const id = generateUUID();
  const slug = generateSlug();

  await run(
    db,
    `INSERT INTO sessions (id, slug, owner_id) VALUES (?1, ?2, ?3)`,
    [id, slug, playerId],
  );

  const result = await query(
    db,
    `
    SELECT s.*,
           p.id AS owner_id,
           p.username AS owner_username,
           p.wins AS owner_wins
    FROM sessions s
    JOIN players p ON s.owner_id = p.id
    WHERE s.id = ?1
    `,
    [id],
  );

  return mapToSession(result.rows[0]);
}

interface JoinSessionPayload {
  db: D1Database;
  slug: string;
  friend: { playerId: string };
}

export async function assignFriendToSession(
  payload: JoinSessionPayload,
): Promise<SessionWaitingForBoats> {
  const { db, slug, friend } = payload;
  const { playerId } = friend;

  await run(db, `UPDATE sessions SET friend_id = ?1 WHERE slug = ?2`, [
    playerId,
    slug,
  ]);

  const result = await query(
    db,
    `
    SELECT s.*,
           o.id AS owner_id,
           o.username AS owner_username,
           o.wins AS owner_wins,
           f.id AS friend_id,
           f.username AS friend_username,
           f.wins AS friend_wins
    FROM sessions s
    JOIN players o ON s.owner_id = o.id
    JOIN players f ON s.friend_id = f.id
    WHERE s.slug = ?1
    `,
    [slug],
  );

  const session: Session = mapToSession(result.rows[0]);
  if (session.status !== "waiting_for_boat_placements") {
    throw new UnexpectedDatabaseError(
      `Session is in unexpected '${session.status}' status: ${slug}`,
    );
  }
  return session;
}

interface SetCurrentTurnPayload {
  db: D1Database;
  sessionId: string;
  playerId: string;
}

export async function setCurrentTurn(
  payload: SetCurrentTurnPayload,
): Promise<SessionPlaying> {
  const { db, sessionId, playerId } = payload;

  await run(db, `UPDATE sessions SET current_turn_id = ?1 WHERE id = ?2`, [
    playerId,
    sessionId,
  ]);

  const session = await getSessionById(db, sessionId);
  if (!session) {
    throw new RecordNotFoundError(`Session not found: ${sessionId}`);
  }

  if (!isSessionPlaying(session)) {
    throw new UnexpectedDatabaseError(
      `Session is in unexpected '${session.status}' status: ${sessionId}`,
    );
  }

  return session;
}

interface SetWinnerPayload {
  db: D1Database;
  sessionId: string;
  winnerId: string;
}

export async function setWinner(
  payload: SetWinnerPayload,
): Promise<SessionGameOver> {
  const { db, sessionId, winnerId } = payload;

  await run(
    db,
    `UPDATE sessions SET winner_id = ?1, current_turn_id = NULL WHERE id = ?2`,
    [winnerId, sessionId],
  );

  const session = await getSessionById(db, sessionId);
  if (!session) {
    throw new RecordNotFoundError(`Session not found: ${sessionId}`);
  }

  return session as SessionGameOver;
}

interface ResetSessionPayload {
  db: D1Database;
  sessionId: string;
}

export async function resetSessionToBoatPlacement(
  payload: ResetSessionPayload,
): Promise<SessionWaitingForBoats> {
  const { db, sessionId } = payload;

  const sessionResult = await query(
    db,
    `SELECT owner_id, friend_id FROM sessions WHERE id = ?1`,
    [sessionId],
  );

  if (sessionResult.rows.length === 0) {
    throw new RecordNotFoundError(`Session not found: ${sessionId}`);
  }

  const { owner_id, friend_id } = sessionResult.rows[0] as {
    owner_id: string;
    friend_id: string | null;
  };

  await run(db, `DELETE FROM boats WHERE player_id = ?1`, [owner_id]);
  if (friend_id) {
    await run(db, `DELETE FROM boats WHERE player_id = ?1`, [friend_id]);
  }

  await run(db, `DELETE FROM shots WHERE session_id = ?1`, [sessionId]);

  await run(
    db,
    `UPDATE sessions SET winner_id = NULL, current_turn_id = NULL WHERE id = ?1`,
    [sessionId],
  );

  const session = await getSessionById(db, sessionId);
  if (!session) {
    throw new RecordNotFoundError(`Session not found: ${sessionId}`);
  }

  if (session.status !== "waiting_for_boat_placements") {
    throw new UnexpectedDatabaseError(
      `Session is in unexpected '${session.status}' status after reset: ${sessionId}`,
    );
  }

  return session;
}

interface GetSessionByPlayerIdPayload {
  db: D1Database;
  playerId: string;
}

export async function getSessionByPlayerId(
  payload: GetSessionByPlayerIdPayload,
): Promise<Session | null> {
  const { db, playerId } = payload;
  return getSessionByPlayerIdInternal(db, playerId);
}

async function getSessionByPlayerIdInternal(
  db: D1Database,
  playerId: string,
): Promise<Session | null> {
  const result = await query(
    db,
    `
    SELECT s.*,
           o.id AS owner_id,
           o.username AS owner_username,
           o.wins AS owner_wins,
           f.id AS friend_id,
           f.username AS friend_username,
           f.wins AS friend_wins
    FROM sessions s
    JOIN players o ON s.owner_id = o.id
    LEFT JOIN players f ON s.friend_id = f.id
    WHERE s.owner_id = ?1 OR s.friend_id = ?1
    `,
    [playerId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const sessionRow = result.rows[0];
  return buildFullSession(db, sessionRow);
}

async function getSessionById(
  db: D1Database,
  sessionId: string,
): Promise<Session | null> {
  const result = await query(
    db,
    `
    SELECT s.*,
           o.id AS owner_id,
           o.username AS owner_username,
           o.wins AS owner_wins,
           f.id AS friend_id,
           f.username AS friend_username,
           f.wins AS friend_wins
    FROM sessions s
    JOIN players o ON s.owner_id = o.id
    LEFT JOIN players f ON s.friend_id = f.id
    WHERE s.id = ?1
    `,
    [sessionId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const sessionRow = result.rows[0];
  return buildFullSession(db, sessionRow);
}

async function buildFullSession(
  db: D1Database,
  sessionRow: Record<string, unknown>,
): Promise<Session> {
  const sessionId = sessionRow.id as string;
  const ownerId = sessionRow.owner_id as string;
  const friendId = sessionRow.friend_id as string | null;

  const ownerBoatsResult = await query(
    db,
    `SELECT * FROM boats WHERE player_id = ?1`,
    [ownerId],
  );
  const ownerBoats = ownerBoatsResult.rows;

  let friendBoats: Record<string, unknown>[] = [];
  if (friendId) {
    const friendBoatsResult = await query(
      db,
      `SELECT * FROM boats WHERE player_id = ?1`,
      [friendId],
    );
    friendBoats = friendBoatsResult.rows;
  }

  const shotsResult = await query(
    db,
    `SELECT * FROM shots WHERE session_id = ?1 ORDER BY created_at ASC`,
    [sessionId],
  );

  return mapToSession({
    ...sessionRow,
    owner_boats: ownerBoats.length > 0 ? ownerBoats : null,
    friend_boats: friendBoats.length > 0 ? friendBoats : null,
    shots: shotsResult.rows.length > 0 ? shotsResult.rows : null,
  });
}

interface DisconnectPlayerResult {
  remainingPlayer: Player | null;
}

interface DisconnectPlayerPayload {
  db: D1Database;
  sessionId: string;
  leavingPlayerId: string;
  isOwner: boolean;
}

const RemainingPlayerDatabaseSchema = z.object({
  remaining_id: z.string(),
  remaining_username: z.string(),
  remaining_wins: z.coerce.number().int(),
});

const mapToRemainingPlayer = generateMapperToDomainModel({
  schema: RemainingPlayerDatabaseSchema,
  mapper: (parsed) => ({
    id: parsed.remaining_id,
    username: parsed.remaining_username,
    wins: parsed.remaining_wins,
  }),
});

async function deleteBoatsForPlayer(
  db: D1Database,
  playerId: string,
): Promise<void> {
  await run(db, `DELETE FROM boats WHERE player_id = ?1`, [playerId]);
}

async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await run(db, `DELETE FROM sessions WHERE id = ?1`, [sessionId]);
}

async function checkHasFriend(
  db: D1Database,
  sessionId: string,
): Promise<boolean> {
  const result = await query(
    db,
    `SELECT friend_id FROM sessions WHERE id = ?1`,
    [sessionId],
  );
  return result.rows.length > 0 && result.rows[0].friend_id != null;
}

async function updateSessionAndGetRemainingPlayer(
  db: D1Database,
  sessionId: string,
  isOwner: boolean,
): Promise<Player | null> {
  if (isOwner) {
    await run(
      db,
      `UPDATE sessions
       SET owner_id = friend_id, friend_id = NULL, current_turn_id = NULL, winner_id = NULL
       WHERE id = ?1`,
      [sessionId],
    );
  } else {
    await run(
      db,
      `UPDATE sessions
       SET friend_id = NULL, current_turn_id = NULL, winner_id = NULL
       WHERE id = ?1`,
      [sessionId],
    );
  }

  const result = await query(
    db,
    `
    SELECT
      p.id AS remaining_id,
      p.username AS remaining_username,
      p.wins AS remaining_wins
    FROM sessions s
    JOIN players p ON s.owner_id = p.id
    WHERE s.id = ?1
    `,
    [sessionId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapToRemainingPlayer(result.rows[0]);
}

export async function disconnectPlayerFromSession(
  payload: DisconnectPlayerPayload,
): Promise<DisconnectPlayerResult> {
  const { db, sessionId, leavingPlayerId, isOwner } = payload;

  await deleteBoatsForPlayer(db, leavingPlayerId);
  await run(db, `DELETE FROM shots WHERE session_id = ?1`, [sessionId]);

  if (isOwner) {
    const hasFriend = await checkHasFriend(db, sessionId);

    if (!hasFriend) {
      await deleteSession(db, sessionId);
      return { remainingPlayer: null };
    }
  }

  const remainingPlayer = await updateSessionAndGetRemainingPlayer(
    db,
    sessionId,
    isOwner,
  );

  if (remainingPlayer != null) {
    await deleteBoatsForPlayer(db, remainingPlayer.id);
  }

  return { remainingPlayer };
}

const SessionDatabaseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  owner_id: z.string(),
  owner_username: z.string(),
  owner_wins: z.coerce.number().int().default(0),
  owner_boats: z.array(BoatDatabaseSchema).optional().nullable(),
  friend_id: z.string().optional().nullable(),
  friend_username: z.string().optional().nullable(),
  friend_wins: z.coerce.number().int().optional().nullable(),
  friend_boats: z.array(BoatDatabaseSchema).optional().nullable(),
  current_turn_id: z.string().optional().nullable(),
  winner_id: z.string().optional().nullable(),
  shots: z.array(ShotDatabaseSchema).optional().nullable(),
});

function hasFriend(parsed: z.infer<typeof SessionDatabaseSchema>): boolean {
  return parsed.friend_id != null && parsed.friend_username != null;
}

function hasBoatPlacements(
  parsed: z.infer<typeof SessionDatabaseSchema>,
): boolean {
  return parsed.owner_boats != null && parsed.friend_boats != null;
}

function hasCurrentTurnSet(
  parsed: z.infer<typeof SessionDatabaseSchema>,
): boolean {
  return parsed.current_turn_id != null;
}

function createBaseSession(parsed: z.infer<typeof SessionDatabaseSchema>) {
  return {
    id: parsed.id,
    slug: parsed.slug,
    owner: {
      id: parsed.owner_id,
      username: parsed.owner_username,
      wins: parsed.owner_wins,
    },
  };
}

function createFriendData(parsed: z.infer<typeof SessionDatabaseSchema>) {
  if (!parsed.friend_id || !parsed.friend_username) {
    throw new Error("Friend data is incomplete");
  }

  return {
    id: parsed.friend_id,
    username: parsed.friend_username,
    wins: parsed.friend_wins ?? 0,
  };
}

function mapToWaitingForFriend(
  parsed: z.infer<typeof SessionDatabaseSchema>,
): SessionCreated {
  return {
    ...createBaseSession(parsed),
    status: "waiting_for_opponent",
  };
}

function mapToWaitingForBoatPlacements(
  parsed: z.infer<typeof SessionDatabaseSchema>,
): SessionWaitingForBoats {
  return {
    ...createBaseSession(parsed),
    status: "waiting_for_boat_placements",
    friend: createFriendData(parsed),
  };
}

function mapToReadyToStart(
  parsed: z.infer<typeof SessionDatabaseSchema>,
): SessionReadyToStart {
  return {
    ...createBaseSession(parsed),
    status: "ready_to_start",
    friend: createFriendData(parsed),
  };
}

function mapToPlaying(
  parsed: z.infer<typeof SessionDatabaseSchema>,
): SessionPlaying {
  if (!parsed.current_turn_id) {
    throw new Error("Current turn ID is missing");
  }

  return {
    ...createBaseSession(parsed),
    status: "playing",
    ownerBoats: parsed.owner_boats?.map(mapToBoat) ?? [],
    friend: createFriendData(parsed),
    friendBoats: parsed.friend_boats?.map(mapToBoat) ?? [],
    currentTurn: { id: parsed.current_turn_id },
    shots: parsed.shots?.map(mapToShot) ?? [],
  };
}

function mapToGameOver(
  parsed: z.infer<typeof SessionDatabaseSchema>,
): SessionGameOver {
  if (!parsed.winner_id) {
    throw new Error("Winner ID is missing");
  }

  return {
    ...createBaseSession(parsed),
    status: "playing",
    ownerBoats: parsed.owner_boats?.map(mapToBoat) ?? [],
    friend: createFriendData(parsed),
    friendBoats: parsed.friend_boats?.map(mapToBoat) ?? [],
    shots: parsed.shots?.map(mapToShot) ?? [],
    winner: { id: parsed.winner_id },
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
