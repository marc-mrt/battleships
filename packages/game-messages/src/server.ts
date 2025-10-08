import { z } from "zod";

export const FriendJoinedMessageSchema = z.object({
  type: z.literal("friend-joined"),
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

export const ReadyToPlayMessageSchema = z.object({
  type: z.literal("ready-to-play"),
  data: z.object({
    session: z.object({
      status: z.literal("ready_to_play"),
    }),
  }),
});
export type ReadyToPlayMessage = z.infer<typeof ReadyToPlayMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  FriendJoinedMessageSchema,
  ReadyToPlayMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
