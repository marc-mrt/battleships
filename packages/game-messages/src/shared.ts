import { GRID_SIZE } from "game-rules";
import { z } from "zod";

export const CoordinateSchema = z
  .number()
  .int()
  .min(0)
  .max(GRID_SIZE - 1);
