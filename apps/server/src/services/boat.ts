import * as BoatDB from "../database/boat";
import type { Boat } from "../models/boat";
import type { Coordinates } from "../models/coordinates";

interface SaveBoatsPayload {
  db: D1Database;
  playerId: string;
  boats: Array<{
    id: string;
    startX: number;
    startY: number;
    length: number;
    orientation: "horizontal" | "vertical";
  }>;
}

export async function saveBoats(payload: SaveBoatsPayload): Promise<void> {
  const { db, playerId, boats } = payload;
  await BoatDB.saveBoats({
    db,
    playerId,
    boats,
  });
}

interface MarkBoatAsSunkPayload {
  db: D1Database;
  boatId: string;
}

export async function markBoatAsSunk(
  payload: MarkBoatAsSunkPayload,
): Promise<void> {
  const { db, boatId } = payload;
  await BoatDB.markBoatAsSunk({ db, boatId });
}

export function isCoordinateOnBoat(coordinates: Coordinates) {
  return function checkBoat(boat: Boat): boolean {
    const { x, y } = coordinates;
    if (boat.orientation === "horizontal") {
      return (
        y === boat.startY && x >= boat.startX && x < boat.startX + boat.length
      );
    }
    if (boat.orientation === "vertical") {
      return (
        x === boat.startX && y >= boat.startY && y < boat.startY + boat.length
      );
    }
    return false;
  };
}
