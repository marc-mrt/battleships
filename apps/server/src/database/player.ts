import { z } from "zod";
import type { Player } from "../models/player";
import { generateUUID } from "../utils/uuid";
import { query } from "./db";
import { generateMapperToDomainModel } from "./mapper";

interface CreatePlayerPayload {
  db: D1Database;
  username: string;
}

export async function createPlayer(
  payload: CreatePlayerPayload,
): Promise<Player> {
  const { db, username } = payload;
  const id = generateUUID();

  const result = await query(
    db,
    "INSERT INTO players (id, username) VALUES (?1, ?2) RETURNING *",
    [id, username],
  );

  return mapToPlayer(result.rows[0]);
}

interface IncrementWinsPayload {
  db: D1Database;
  playerId: string;
}

export async function incrementWins(
  payload: IncrementWinsPayload,
): Promise<void> {
  const { db, playerId } = payload;
  await query(db, "UPDATE players SET wins = wins + 1 WHERE id = ?1", [
    playerId,
  ]);
}

const PlayerDatabaseSchema = z.object({
  id: z.string(),
  username: z.string(),
  wins: z.coerce.number().int().default(0),
});

function mapper(parsed: z.infer<typeof PlayerDatabaseSchema>): Player {
  return {
    id: parsed.id,
    username: parsed.username,
    wins: parsed.wins,
  };
}

const mapToPlayer = generateMapperToDomainModel({
  schema: PlayerDatabaseSchema,
  mapper,
});
