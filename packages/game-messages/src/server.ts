import { z } from "zod";

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

export const GameStartedMessageSchema = z.object({
  type: z.literal("game_started"),
  data: z.object({
    session: z.object({
      status: z.literal("in_game"),
    }),
  }),
});
export type GameStartedMessage = z.infer<typeof GameStartedMessageSchema>;

export const YourTurnMessageSchema = z.object({
  type: z.literal("your_turn"),
  data: z.object({
    sessionId: z.string(),
  }),
});
export type YourTurnMessage = z.infer<typeof YourTurnMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  FriendJoinedMessageSchema,
  GameStartedMessageSchema,
  YourTurnMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
