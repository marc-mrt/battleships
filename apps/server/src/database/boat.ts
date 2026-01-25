import { TOTAL_BOATS_COUNT } from "game-rules";
import { z } from "zod";
import type { Boat } from "../models/boat";
import { type Database, query, run } from "./db";
import { InvalidQueryPayloadError } from "./errors";
import { generateMapperToDomainModel } from "./mapper";

interface BoatData {
  id: string;
  startX: number;
  startY: number;
  length: number;
  orientation: "horizontal" | "vertical";
}

interface SaveBoatsPayload {
  db: Database;
  playerId: string;
  boats: BoatData[];
}

function createPlaceholders(boatCount: number): string {
  const rows: string[] = [];
  for (let i = 0; i < boatCount; i++) {
    const offset = i * 6;
    rows.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`,
    );
  }
  return rows.join(", ");
}

function flattenBoatsToParams(
  playerId: string,
  boats: BoatData[],
): (string | number)[] {
  const params: (string | number)[] = [];
  for (const boat of boats) {
    params.push(
      boat.id,
      playerId,
      boat.startX,
      boat.startY,
      boat.length,
      boat.orientation,
    );
  }
  return params;
}

async function deleteBoats(db: Database, playerId: string): Promise<void> {
  await run(db, "DELETE FROM boats WHERE player_id = $1", [playerId]);
}

export async function saveBoats(payload: SaveBoatsPayload): Promise<void> {
  const { db, playerId, boats } = payload;

  if (boats.length !== TOTAL_BOATS_COUNT) {
    throw new InvalidQueryPayloadError(
      `Need ${TOTAL_BOATS_COUNT} boats, got ${boats.length}`,
    );
  }

  await deleteBoats(db, playerId);

  const placeholders = createPlaceholders(boats.length);
  const params = flattenBoatsToParams(playerId, boats);

  const insertQuery = `
    INSERT INTO boats (id, player_id, start_x, start_y, length, orientation)
    VALUES ${placeholders}
  `;

  await run(db, insertQuery, params);
}

interface MarkBoatAsSunkPayload {
  db: Database;
  boatId: string;
}

export async function markBoatAsSunk(
  payload: MarkBoatAsSunkPayload,
): Promise<Boat> {
  const { db, boatId } = payload;
  const result = await query(
    db,
    "UPDATE boats SET sunk = true WHERE id = $1 RETURNING *",
    [boatId],
  );
  return mapToBoat(result.rows[0]);
}

interface GetBoatsByPlayerIdPayload {
  db: Database;
  playerId: string;
}

export async function getBoatsByPlayerId(
  payload: GetBoatsByPlayerIdPayload,
): Promise<Boat[]> {
  const { db, playerId } = payload;
  const result = await query(db, "SELECT * FROM boats WHERE player_id = $1", [
    playerId,
  ]);
  return result.rows.map(mapToBoat);
}

interface DeleteBoatsByPlayerIdPayload {
  db: Database;
  playerId: string;
}

export async function deleteBoatsByPlayerId(
  payload: DeleteBoatsByPlayerIdPayload,
): Promise<void> {
  const { db, playerId } = payload;
  await deleteBoats(db, playerId);
}

export const BoatDatabaseSchema = z.object({
  id: z.string(),
  start_x: z.coerce.number(),
  start_y: z.coerce.number(),
  length: z.coerce.number(),
  orientation: z.enum(["horizontal", "vertical"]),
  sunk: z.coerce.boolean(),
});

function mapper(parsed: z.infer<typeof BoatDatabaseSchema>): Boat {
  return {
    id: parsed.id,
    startX: parsed.start_x,
    startY: parsed.start_y,
    length: parsed.length,
    orientation: parsed.orientation,
    sunk: parsed.sunk,
  };
}

export const mapToBoat = generateMapperToDomainModel({
  schema: BoatDatabaseSchema,
  mapper,
});
