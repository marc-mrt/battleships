import {z} from "zod";

export const BoatPlacementSchema = z.object({
    id: z.string(),
    startX: z.number().int().min(0).max(9),
    startY: z.number().int().min(0).max(9),
    length: z.number().int().min(1).max(5),
    orientation: z.enum(['horizontal', 'vertical']),
})

export type BoatPlacement = z.infer<typeof BoatPlacementSchema>

export type PlayerPlacedBoatsMessage = z.infer<typeof PlayerPlacedBoatsMessageSchema>
export const PlayerPlacedBoatsMessageSchema = z.object({
    type: z.literal('player-placed-boats'),
    data: z.object({
        boats: z.array(BoatPlacementSchema),
    })
})

export type ClientMessage = z.infer<typeof ClientMessageSchema>
export const ClientMessageSchema = z.discriminatedUnion('type', [PlayerPlacedBoatsMessageSchema])
