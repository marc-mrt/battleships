import {z} from "zod";

export type FriendJoinedMessage = z.infer<typeof FriendJoinedMessageSchema>
export const FriendJoinedMessageSchema = z.object({
    type: z.literal('friend-joined'), data: z.object({
        session: z.object({
            status: z.literal('all_players_joined'),
        }),
        friend: z.object({
            playerId: z.string(),
            username: z.string(),
        })
    })
})

export type GameMessage = z.infer<typeof GameMessageSchema>
export const GameMessageSchema = z.discriminatedUnion('type', [FriendJoinedMessageSchema])
