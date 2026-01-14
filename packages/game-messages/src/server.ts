import { z } from "zod";
import { CoordinateSchema } from "./shared";

export const OpponentJoinedMessageSchema = z.object({
  type: z.literal("opponent_joined"),
  data: z.object({
    session: z.object({
      status: z.literal("waiting_for_boat_placements"),
    }),
    opponent: z.object({
      id: z.string(),
      username: z.string(),
      isOwner: z.boolean(),
      wins: z.number().int(),
    }),
  }),
});
export type OpponentJoinedMessage = z.infer<typeof OpponentJoinedMessageSchema>;

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

export const LastShotSchema = ShotSchema.and(
  z.object({
    sunkBoat: z.boolean(),
  }),
);
export type LastShot = z.infer<typeof LastShotSchema>;

export const PlayerGameStateSchema = z.object({
  boats: z.array(BoatSchema),
  shots: z.array(ShotSchema),
  wins: z.number().int(),
});
export type PlayerGameState = z.infer<typeof PlayerGameStateSchema>;

export const OpponentGameStateSchema = z.object({
  sunkBoats: z.array(BoatSchema),
  shotsAgainstPlayer: z.array(ShotSchema),
  wins: z.number().int(),
});
export type OpponentGameState = z.infer<typeof OpponentGameStateSchema>;

const BaseGameStateSchema = z.object({
  session: z.object({
    status: z.literal("playing"),
  }),
  player: PlayerGameStateSchema,
  opponent: OpponentGameStateSchema,
  lastShot: LastShotSchema.nullable(),
});

export const GameInProgressStateSchema = BaseGameStateSchema.extend({
  status: z.literal("in_progress"),
  turn: z.enum(["player", "opponent"]),
});
export type GameInProgressState = z.infer<typeof GameInProgressStateSchema>;

export const GameOverStateSchema = BaseGameStateSchema.extend({
  status: z.literal("over"),
  winner: z.enum(["player", "opponent"]),
});
export type GameOverState = z.infer<typeof GameOverStateSchema>;

export const GameStateSchema = z.discriminatedUnion("status", [
  GameInProgressStateSchema,
  GameOverStateSchema,
]);
export type GameState = z.infer<typeof GameStateSchema>;

export const GameUpdateMessageSchema = z.object({
  type: z.literal("game_update"),
  data: GameStateSchema,
});
export type GameUpdateMessage = z.infer<typeof GameUpdateMessageSchema>;

export const NewGameStartedMessageSchema = z.object({
  type: z.literal("new_game_started"),
  data: z.object({
    session: z.object({
      status: z.literal("waiting_for_boat_placements"),
    }),
  }),
});
export type NewGameStartedMessage = z.infer<typeof NewGameStartedMessageSchema>;

export const OpponentDisconnectedMessageSchema = z.object({
  type: z.literal("opponent_disconnected"),
  data: z.object({
    session: z.object({
      status: z.literal("waiting_for_opponent"),
    }),
  }),
});
export type OpponentDisconnectedMessage = z.infer<
  typeof OpponentDisconnectedMessageSchema
>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  OpponentJoinedMessageSchema,
  GameUpdateMessageSchema,
  NewGameStartedMessageSchema,
  OpponentDisconnectedMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
