import type { GameState } from "game-messages";
import * as R from "ramda";
import type {
  BoatInfo,
  CellState,
  OpponentGridData,
  PlayerGridData,
  Position,
} from "./types";

function getBoatCells(boat: BoatInfo): Position[] {
  return R.times(
    (i) => ({
      x: boat.orientation === "horizontal" ? boat.startX + i : boat.startX,
      y: boat.orientation === "vertical" ? boat.startY + i : boat.startY,
    }),
    boat.length,
  );
}

export function positionKey(x: number, y: number): string {
  return `${x}-${y}`;
}

export function buildPlayerGridData(game: GameState): PlayerGridData {
  const boats = new Set<string>();
  const sunkBoats = new Set<string>();
  const hits = new Set<string>();
  const misses = new Set<string>();

  const hitPositions = new Set<string>();
  for (const shot of game.opponent.shotsAgainstPlayer) {
    const key = positionKey(shot.x, shot.y);
    if (shot.hit) {
      hits.add(key);
      hitPositions.add(key);
    } else {
      misses.add(key);
    }
  }

  for (const boat of game.player.boats) {
    const cells = getBoatCells(boat);
    const allCellsHit = cells.every((cell) =>
      hitPositions.has(positionKey(cell.x, cell.y)),
    );

    for (const cell of cells) {
      const key = positionKey(cell.x, cell.y);
      boats.add(key);
      if (allCellsHit) {
        sunkBoats.add(key);
      }
    }
  }

  return { boats, hits, misses, sunkBoats };
}

export function buildOpponentGridData(game: GameState): OpponentGridData {
  const hits = new Set<string>();
  const misses = new Set<string>();
  const sunkBoats = new Set<string>();

  for (const shot of game.player.shots) {
    const key = positionKey(shot.x, shot.y);
    if (shot.hit) {
      hits.add(key);
    } else {
      misses.add(key);
    }
  }

  for (const boat of game.opponent.sunkBoats) {
    const cells = getBoatCells(boat);
    for (const cell of cells) {
      sunkBoats.add(positionKey(cell.x, cell.y));
    }
  }

  return { hits, misses, sunkBoats };
}

export function getPlayerCellState(
  data: PlayerGridData,
  x: number,
  y: number,
): CellState {
  const key = positionKey(x, y);

  if (data.sunkBoats.has(key)) {
    return "sunk";
  }
  if (data.hits.has(key)) {
    return "hit";
  }
  if (data.misses.has(key)) {
    return "miss";
  }
  if (data.boats.has(key)) {
    return "boat";
  }
  return "empty";
}

interface GetOpponentCellStatePayload {
  data: OpponentGridData;
  x: number;
  y: number;
  isPlayerTurn: boolean;
}

export function getOpponentCellState(
  payload: GetOpponentCellStatePayload,
): CellState {
  const { data, x, y, isPlayerTurn } = payload;
  const key = positionKey(x, y);

  if (data.sunkBoats.has(key)) {
    return "sunk";
  }
  if (data.hits.has(key)) {
    return "hit";
  }
  if (data.misses.has(key)) {
    return "miss";
  }
  if (isPlayerTurn) {
    return "targetable";
  }
  return "empty";
}
