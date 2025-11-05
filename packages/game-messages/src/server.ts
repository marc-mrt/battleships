import { z } from "zod";
import { CoordinateSchema } from "./shared";

export const FriendJoinedMessageSchema = z.object({
  type: z.literal("friend_joined"),
  data: z.object({
    session: z.object({
      status: z.literal("waiting_for_boat_placements"),
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
  orientation: z.enum(["horizontal", "vertical"]),
  length: z.number().int().min(2).max(5),
});

export const ShotSchema = z.object({
  x: CoordinateSchema,
  y: CoordinateSchema,
  hit: z.boolean(),
});

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

export const GameStateSchema = z.object({
  turn: z.enum(["player_turn", "opponent_turn"]),
  session: z.object({
    status: z.enum(["in_game", "game_over"]),
  }),
  player: PlayerGameStateSchema,
  opponent: OpponentGameStateSchema,
});
export type GameState = z.infer<typeof GameStateSchema>;

export const NextTurnMessageSchema = z.object({
  type: z.literal("next_turn"),
  data: GameStateSchema,
});
export type NextTurnMessage = z.infer<typeof NextTurnMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  FriendJoinedMessageSchema,
  NextTurnMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
