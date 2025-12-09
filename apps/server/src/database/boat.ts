import { TOTAL_BOATS_COUNT } from "game-rules";
import { z } from "zod";
import type { Boat } from "../models/boat";
import { query } from "./db";
import { InvalidQueryPayloadError } from "./errors";
import { generateMapperToDomainModel } from "./mapper";

interface SaveBoatsPayload {
  playerId: string;
  boats: Array<{
    id: string;
    startX: number;
    startY: number;
    length: number;
    orientation: "horizontal" | "vertical";
  }>;
}

function createBoatConfigurationRow(playerId: string) {
  return function mapBoat(boat: {
    id: string;
    startX: number;
    startY: number;
    length: number;
    orientation: "horizontal" | "vertical";
  }): (string | number)[] {
    return [
      boat.id,
      playerId,
      boat.startX,
      boat.startY,
      boat.length,
      boat.orientation,
    ];
  };
}

function createPlaceholder(rowLength: number, rowIndex: number) {
  return function mapToPlaceholder(
    _: string | number,
    colIndex: number,
  ): string {
    return `$${rowLength * rowIndex + 1 + colIndex}`;
  };
}

function createValueRow(row: (string | number)[], rowIndex: number): string {
  const values = row.map(createPlaceholder(row.length, rowIndex));
  return `(${values.join(", ")})`;
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
  const boatsConfiguration = boats.map(createBoatConfigurationRow(playerId));

  const valueRows = boatsConfiguration.map(createValueRow);

  const insertQuery = `
		INSERT INTO boats (id, player_id, start_x, start_y, length, orientation)
		VALUES ${valueRows.join(", ")}
	`;

  await query(insertQuery, boatsConfiguration.flat());
}

async function deleteBoats(playerId: string): Promise<void> {
  await query("DELETE FROM boats WHERE player_id = $1", [playerId]);
}

export async function markBoatAsSunk(boatId: string): Promise<Boat> {
  const result = await query(
    "UPDATE boats SET sunk = TRUE WHERE id = $1 RETURNING *",
    [boatId],
  );
  return mapToBoat(result.rows[0]);
}

export const BoatDatabaseSchema = z.object({
  id: z.string(),
  start_x: z.number(),
  start_y: z.number(),
  length: z.number(),
  orientation: z.enum(["horizontal", "vertical"]),
  sunk: z.boolean(),
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
