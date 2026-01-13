import { z } from "zod";
import type { Player } from "../models/player";
import { query } from "./db";
import { generateMapperToDomainModel } from "./mapper";

interface CreatePlayerPayload {
  username: string;
}

export async function createPlayer(
  payload: CreatePlayerPayload,
): Promise<Player> {
  const { username } = payload;
  const result = await query(
    "INSERT INTO players (username) VALUES ($1) RETURNING *",
    [username],
  );

  return mapToPlayer(result.rows[0]);
}

export async function incrementWins(playerId: string): Promise<void> {
  await query("UPDATE players SET wins = wins + 1 WHERE id = $1", [playerId]);
}

const PlayerDatabaseSchema = z.object({
  id: z.string(),
  username: z.string(),
  wins: z.number().int().default(0),
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
