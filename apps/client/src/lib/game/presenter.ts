import * as R from 'ramda';
import type { CellState } from '../grid/types';
import type { GameState as ServerGameState } from 'game-messages';
import { GRID_SIZE } from 'game-rules';
import {
	createEmptyCellGrid,
	applyBoatToCells as applyBoatToCellsUtil,
	applyShotToCells as applyShotToCellsUtil,
} from '../grid/render-utils';

function markAsBoat(cell: CellState): void {
	cell.boat = true;
}

function markAsSunk(cell: CellState): void {
	cell.sunk = true;
}

type Boat = {
	startX: number;
	startY: number;
	length: number;
	orientation: 'horizontal' | 'vertical';
};

type Shot = { x: number; y: number; hit: boolean };

function applyBoatToGrid(boat: Boat, cells: CellState[][]): void {
	applyBoatToCellsUtil(cells, boat, GRID_SIZE, markAsBoat);
}

function applyShotToGrid(shot: Shot, cells: CellState[][]): void {
	applyShotToCellsUtil(cells, shot, GRID_SIZE);
}

function applySunkBoatToGrid(boat: Boat, cells: CellState[][]): void {
	applyBoatToCellsUtil(cells, boat, GRID_SIZE, markAsSunk);
}

function createBoatApplier(cells: CellState[][]) {
	return function applyBoat(boat: Boat): void {
		applyBoatToGrid(boat, cells);
	};
}

function createShotApplier(cells: CellState[][]) {
	return function applyShot(shot: Shot): void {
		applyShotToGrid(shot, cells);
	};
}

function createSunkBoatApplier(cells: CellState[][]) {
	return function applySunkBoat(boat: Boat): void {
		applySunkBoatToGrid(boat, cells);
	};
}

function applyBoatsToGrid(cells: CellState[][], boats: Boat[]): CellState[][] {
	R.forEach(createBoatApplier(cells), boats);
	return cells;
}

function applyShotsToGrid(cells: CellState[][], shots: Shot[]): CellState[][] {
	R.forEach(createShotApplier(cells), shots);
	return cells;
}

function applySunkBoatsToGrid(cells: CellState[][], boats: Boat[]): CellState[][] {
	R.forEach(createSunkBoatApplier(cells), boats);
	return cells;
}

function applyBoats(boats: Boat[]) {
	return function applyToGrid(cells: CellState[][]): CellState[][] {
		return applyBoatsToGrid(cells, boats);
	};
}

function applyShots(shots: Shot[]) {
	return function applyToGrid(cells: CellState[][]): CellState[][] {
		return applyShotsToGrid(cells, shots);
	};
}

function applySunkBoats(boats: Boat[]) {
	return function applyToGrid(cells: CellState[][]): CellState[][] {
		return applySunkBoatsToGrid(cells, boats);
	};
}

export function renderPlayerGrid(serverGame: ServerGameState): CellState[][] {
	return R.pipe(
		applyBoats(serverGame.player.boats),
		applyShots(serverGame.opponent.shotsAgainstPlayer),
	)(createEmptyCellGrid(GRID_SIZE));
}

export function renderOpponentGrid(serverGame: ServerGameState): CellState[][] {
	return R.pipe(
		applyShots(serverGame.player.shots),
		applySunkBoats(serverGame.opponent.sunkBoats),
	)(createEmptyCellGrid(GRID_SIZE));
}
