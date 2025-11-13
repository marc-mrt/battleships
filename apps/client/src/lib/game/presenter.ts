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

interface ApplyBoatToGridPayload {
	boat: Boat;
	cells: CellState[][];
}

function applyBoatToGrid(payload: ApplyBoatToGridPayload): void {
	applyBoatToCellsUtil({
		cells: payload.cells,
		boat: payload.boat,
		size: GRID_SIZE,
		applyFn: markAsBoat,
	});
}

interface ApplyShotToGridPayload {
	shot: Shot;
	cells: CellState[][];
}

function applyShotToGrid(payload: ApplyShotToGridPayload): void {
	applyShotToCellsUtil({ cells: payload.cells, shot: payload.shot, size: GRID_SIZE });
}

interface ApplySunkBoatToGridPayload {
	boat: Boat;
	cells: CellState[][];
}

function applySunkBoatToGrid(payload: ApplySunkBoatToGridPayload): void {
	applyBoatToCellsUtil({
		cells: payload.cells,
		boat: payload.boat,
		size: GRID_SIZE,
		applyFn: markAsSunk,
	});
}

function createBoatApplier(cells: CellState[][]) {
	return function applyBoat(boat: Boat): void {
		applyBoatToGrid({ boat, cells });
	};
}

function createShotApplier(cells: CellState[][]) {
	return function applyShot(shot: Shot): void {
		applyShotToGrid({ shot, cells });
	};
}

function createSunkBoatApplier(cells: CellState[][]) {
	return function applySunkBoat(boat: Boat): void {
		applySunkBoatToGrid({ boat, cells });
	};
}

interface ApplyBoatsToGridPayload {
	cells: CellState[][];
	boats: Boat[];
}

function applyBoatsToGrid(payload: ApplyBoatsToGridPayload): CellState[][] {
	R.forEach(createBoatApplier(payload.cells), payload.boats);
	return payload.cells;
}

interface ApplyShotsToGridPayload {
	cells: CellState[][];
	shots: Shot[];
}

function applyShotsToGrid(payload: ApplyShotsToGridPayload): CellState[][] {
	R.forEach(createShotApplier(payload.cells), payload.shots);
	return payload.cells;
}

interface ApplySunkBoatsToGridPayload {
	cells: CellState[][];
	boats: Boat[];
}

function applySunkBoatsToGrid(payload: ApplySunkBoatsToGridPayload): CellState[][] {
	R.forEach(createSunkBoatApplier(payload.cells), payload.boats);
	return payload.cells;
}

function applyBoats(boats: Boat[]) {
	return function applyToGrid(cells: CellState[][]): CellState[][] {
		return applyBoatsToGrid({ cells, boats });
	};
}

function applyShots(shots: Shot[]) {
	return function applyToGrid(cells: CellState[][]): CellState[][] {
		return applyShotsToGrid({ cells, shots });
	};
}

function applySunkBoats(boats: Boat[]) {
	return function applyToGrid(cells: CellState[][]): CellState[][] {
		return applySunkBoatsToGrid({ cells, boats });
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
