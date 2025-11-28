import * as R from 'ramda';
import type { CellState, ModifiableBoat, Shot } from './types';

const EMPTY_CELL: CellState = {};

function createEmptyCell(): CellState {
	return EMPTY_CELL;
}

function createEmptyRow(size: number): CellState[] {
	return R.times(createEmptyCell, size);
}

export function createEmptyCellGrid(size: number): CellState[][] {
	return R.times(() => createEmptyRow(size), size);
}

function calculateBoatPosition(
	boat: { startX: number; startY: number; orientation: 'horizontal' | 'vertical' },
	index: number,
) {
	return {
		x: boat.orientation === 'horizontal' ? boat.startX + index : boat.startX,
		y: boat.orientation === 'vertical' ? boat.startY + index : boat.startY,
	};
}

function isValidPosition(x: number, y: number, size: number): boolean {
	return x >= 0 && x < size && y >= 0 && y < size;
}

function transformCellAtPosition(
	cells: CellState[][],
	x: number,
	y: number,
	size: number,
	transformFn: (cell: CellState) => CellState,
): CellState[][] {
	if (!isValidPosition(x, y, size)) {
		return cells;
	}

	return R.update(y, R.update(x, transformFn(cells[y][x]), cells[y]), cells);
}

interface ApplyBoatToCellsPayload {
	cells: CellState[][];
	boat: ModifiableBoat;
	size: number;
	transformFn: (cell: CellState) => CellState;
}

function applyBoatToCells(payload: ApplyBoatToCellsPayload): CellState[][] {
	const { cells, boat, size, transformFn } = payload;

	const applyTransformAtIndex = (acc: CellState[][], index: number): CellState[][] => {
		const { x, y } = calculateBoatPosition(boat, index);
		return transformCellAtPosition(acc, x, y, size, transformFn);
	};

	return R.reduce(applyTransformAtIndex, cells, R.range(0, boat.length));
}

export function applyBoatsToCells(size: number, transformFn: (cell: CellState) => CellState) {
	return (cells: CellState[][], boat: ModifiableBoat): CellState[][] =>
		applyBoatToCells({ cells, boat, size, transformFn });
}

function applyShotToCells(cells: CellState[][], shot: Shot, size: number): CellState[][] {
	if (!isValidPosition(shot.x, shot.y, size)) {
		return cells;
	}

	const transformCell = (cell: CellState) =>
		R.mergeRight(cell, {
			shot: true,
			hit: shot.hit,
			miss: !shot.hit,
		});

	return transformCellAtPosition(cells, shot.x, shot.y, size, transformCell);
}

export function applyShotsToCells(size: number) {
	return (cells: CellState[][], shot: Shot): CellState[][] => applyShotToCells(cells, shot, size);
}
