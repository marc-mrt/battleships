import { z } from 'zod';

export const CoordinateSchema = z.number().int().min(0).max(9);
