import { z } from 'zod';
import { CoordinateSchema } from './shared';

export const FriendJoinedMessageSchema = z.object({
	type: z.literal('friend_joined'),
	data: z.object({
		session: z.object({
			status: z.literal('waiting_for_boat_placements'),
		}),
		friend: z.object({
			playerId: z.string(),
			username: z.string(),
		}),
	}),
});
export type FriendJoinedMessage = z.infer<typeof FriendJoinedMessageSchema>;

export const BoatSchema = z.object({
	startX: CoordinateSchema,
	startY: CoordinateSchema,
	orientation: z.enum(['horizontal', 'vertical']),
	length: z.number().int().min(2).max(5),
});

export const ShotSchema = z.object({
	x: CoordinateSchema,
	y: CoordinateSchema,
	hit: z.boolean(),
});

export const LastShotSchema = ShotSchema.and(
	z.object({
		sunkBoat: z.boolean(),
	}),
);
export type LastShot = z.infer<typeof LastShotSchema>;

export const PlayerGameStateSchema = z.object({
	boats: z.array(BoatSchema),
	shots: z.array(ShotSchema),
});
export type PlayerGameState = z.infer<typeof PlayerGameStateSchema>;

export const OpponentGameStateSchema = z.object({
	sunkBoats: z.array(BoatSchema),
	shotsAgainstPlayer: z.array(ShotSchema),
});
export type OpponentGameState = z.infer<typeof OpponentGameStateSchema>;

const BaseGameStateSchema = z.object({
	player: PlayerGameStateSchema,
	opponent: OpponentGameStateSchema,
	lastShot: LastShotSchema.nullable(),
});

export const GameInProgressStateSchema = BaseGameStateSchema.extend({
	status: z.literal('in_progress'),
	turn: z.enum(['player', 'opponent']),
});
export type GameInProgressState = z.infer<typeof GameInProgressStateSchema>;

export const GameOverStateSchema = BaseGameStateSchema.extend({
	status: z.literal('over'),
	winner: z.enum(['player', 'opponent']),
});
export type GameOverState = z.infer<typeof GameOverStateSchema>;

export const GameStateSchema = z.discriminatedUnion('status', [
	GameInProgressStateSchema,
	GameOverStateSchema,
]);
export type GameState = z.infer<typeof GameStateSchema>;

export const NextTurnMessageSchema = z.object({
	type: z.literal('next_turn'),
	data: GameStateSchema,
});
export type NextTurnMessage = z.infer<typeof NextTurnMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
	FriendJoinedMessageSchema,
	NextTurnMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
