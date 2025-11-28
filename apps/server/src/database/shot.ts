import { query } from './db';
import { z } from 'zod';
import { generateMapperToDomainModel } from './mapper';
import { Shot } from '../models/shot';

interface CreateShotPayload {
	sessionId: string;
	shooterId: string;
	targetId: string;
	x: number;
	y: number;
	hit: boolean;
}

export async function recordShot(payload: CreateShotPayload): Promise<Shot> {
	const result = await query(
		`INSERT INTO shots (session_id, shooter_id, target_id, x, y, hit)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
		[payload.sessionId, payload.shooterId, payload.targetId, payload.x, payload.y, payload.hit],
	);
	return mapToShot(result.rows[0]);
}

export const ShotDatabaseSchema = z.object({
	id: z.string(),
	created_at: z.coerce.date(),
	shooter_id: z.string(),
	target_id: z.string(),
	x: z.number(),
	y: z.number(),
	hit: z.boolean(),
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
