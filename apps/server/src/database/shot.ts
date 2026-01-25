import { z } from "zod";
import type { Shot } from "../models/shot";
import { generateUUID } from "../utils/uuid";
import { type Database, query, run } from "./db";
import { generateMapperToDomainModel } from "./mapper";

interface CreateShotPayload {
  db: Database;
  sessionId: string;
  shooterId: string;
  targetId: string;
  x: number;
  y: number;
  hit: boolean;
}

export async function recordShot(payload: CreateShotPayload): Promise<Shot> {
  const { db, sessionId, shooterId, targetId, x, y, hit } = payload;
  const id = generateUUID();

  const result = await query(
    db,
    `INSERT INTO shots (id, session_id, shooter_id, target_id, x, y, hit)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, sessionId, shooterId, targetId, x, y, hit],
  );
  return mapToShot(result.rows[0]);
}

interface GetShotsBySessionIdPayload {
  db: Database;
  sessionId: string;
}

export async function getShotsBySessionId(
  payload: GetShotsBySessionIdPayload,
): Promise<Shot[]> {
  const { db, sessionId } = payload;
  const result = await query(
    db,
    "SELECT * FROM shots WHERE session_id = $1 ORDER BY created_at ASC",
    [sessionId],
  );
  return result.rows.map(mapToShot);
}

interface DeleteShotsBySessionIdPayload {
  db: Database;
  sessionId: string;
}

export async function deleteShotsBySessionId(
  payload: DeleteShotsBySessionIdPayload,
): Promise<void> {
  const { db, sessionId } = payload;
  await run(db, "DELETE FROM shots WHERE session_id = $1", [sessionId]);
}

export const ShotDatabaseSchema = z.object({
  id: z.string(),
  created_at: z.coerce.date(),
  shooter_id: z.string(),
  target_id: z.string(),
  x: z.coerce.number(),
  y: z.coerce.number(),
  hit: z.coerce.boolean(),
});

function mapper(parsed: z.infer<typeof ShotDatabaseSchema>): Shot {
  return {
    id: parsed.id,
    createdAt: parsed.created_at,
    shooterId: parsed.shooter_id,
    targetId: parsed.target_id,
    x: parsed.x,
    y: parsed.y,
    hit: parsed.hit,
  };
}

export const mapToShot = generateMapperToDomainModel({
  schema: ShotDatabaseSchema,
  mapper,
});
