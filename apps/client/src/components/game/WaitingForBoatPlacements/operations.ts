import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import type { Boat, Position } from "./types";

export function generateBoatId(): string {
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);
  return `boat-${Array.from(array).join("")}`;
}

export function getBoatCells(boat: Boat): Position[] {
  return R.times(
    (i) => ({
      x: boat.orientation === "horizontal" ? boat.startX + i : boat.startX,
      y: boat.orientation === "vertical" ? boat.startY + i : boat.startY,
    }),
    boat.length,
  );
}

export function isValidPosition(pos: Position): boolean {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE;
}

interface CanPlaceBoatPayload {
  boat: Boat;
  boats: Boat[];
  excludeBoatId?: string;
}

export function canPlaceBoat(payload: CanPlaceBoatPayload): boolean {
  const { boat, boats, excludeBoatId } = payload;
  const cells = getBoatCells(boat);

  if (!cells.every(isValidPosition)) {
    return false;
  }

  const otherBoats = excludeBoatId
    ? boats.filter((b) => b.id !== excludeBoatId)
    : boats;

  const occupiedCells = otherBoats.flatMap(getBoatCells);

  return cells.every(
    (cell) => !occupiedCells.some((oc) => oc.x === cell.x && oc.y === cell.y),
  );
}

export function findBoatAtPosition(
  boats: Boat[],
  x: number,
  y: number,
): Boat | undefined {
  return boats.find((b) => {
    const cells = getBoatCells(b);
    return cells.some((c) => c.x === x && c.y === y);
  });
}
