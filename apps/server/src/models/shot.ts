import type { Coordinates } from "./coordinates";

export interface Shot extends Coordinates {
  id: string;
  createdAt: Date;
  shooterId: string;
  targetId: string;
  hit: boolean;
  boatId?: string;
}
