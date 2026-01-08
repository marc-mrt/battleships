export type CellState =
  | "empty"
  | "boat"
  | "hit"
  | "miss"
  | "sunk"
  | "targetable";

export interface Position {
  x: number;
  y: number;
}

export interface BoatInfo {
  startX: number;
  startY: number;
  length: number;
  orientation: "horizontal" | "vertical";
}

export interface PlayerGridData {
  boats: Set<string>;
  hits: Set<string>;
  misses: Set<string>;
  sunkBoats: Set<string>;
}

export interface OpponentGridData {
  hits: Set<string>;
  misses: Set<string>;
  sunkBoats: Set<string>;
}
