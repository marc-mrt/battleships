import type { GameState as ServerGameState } from "game-messages";
import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import {
  applyBoatsToCells,
  applyShotsToCells,
  createEmptyCellGrid,
} from "../grid/render-utils";
import type { CellState, ModifiableBoat, Shot } from "../grid/types";

function markAsBoat(cell: CellState): CellState {
  return { ...cell, boat: true };
}

function markAsSunk(cell: CellState): CellState {
  return { ...cell, sunk: true };
}

function applyBoatsToGrid(boats: ModifiableBoat[]) {
  return (cells: CellState[][]) =>
    boats.reduce(applyBoatsToCells(GRID_SIZE, markAsBoat), cells);
}

function applySunkBoatsToGrid(boats: ModifiableBoat[]) {
  return (cells: CellState[][]) =>
    boats.reduce(applyBoatsToCells(GRID_SIZE, markAsSunk), cells);
}

function applyShotsToGrid(shots: Shot[]) {
  return (cells: CellState[][]) =>
    shots.reduce(applyShotsToCells(GRID_SIZE), cells);
}

export function renderPlayerGrid(serverGame: ServerGameState): CellState[][] {
  return R.pipe(
    applyBoatsToGrid(serverGame.player.boats),
    applyShotsToGrid(serverGame.opponent.shotsAgainstPlayer),
  )(createEmptyCellGrid(GRID_SIZE));
}

export function renderOpponentGrid(serverGame: ServerGameState): CellState[][] {
  return R.pipe(
    applyShotsToGrid(serverGame.player.shots),
    applySunkBoatsToGrid(serverGame.opponent.sunkBoats),
  )(createEmptyCellGrid(GRID_SIZE));
}
