import { z } from "zod";
import { CoordinateSchema } from "./shared";
import {
  MAX_BOAT_LENGTH,
  MIN_BOAT_LENGTH,
  TOTAL_BOATS_COUNT,
} from "game-rules";

export const BoatPlacementSchema = z.object({
  id: z.string(),
  startX: CoordinateSchema,
  startY: CoordinateSchema,
  length: z.number().int().min(MIN_BOAT_LENGTH).max(MAX_BOAT_LENGTH),
  orientation: z.enum(["horizontal", "vertical"]),
});
export type BoatPlacement = z.infer<typeof BoatPlacementSchema>;

export const PlaceBoatsMessageSchema = z.object({
  type: z.literal("place_boats"),
  data: z.object({
    boats: z.array(BoatPlacementSchema).length(TOTAL_BOATS_COUNT),
  }),
});
export type PlaceBoatsMessage = z.infer<typeof PlaceBoatsMessageSchema>;

export const FireShotMessageSchema = z.object({
  type: z.literal("fire_shot"),
  data: z.object({
    x: CoordinateSchema,
    y: CoordinateSchema,
  }),
});
export type FireShotMessage = z.infer<typeof FireShotMessageSchema>;

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export const ClientMessageSchema = z.discriminatedUnion("type", [
  PlaceBoatsMessageSchema,
  FireShotMessageSchema,
]);
