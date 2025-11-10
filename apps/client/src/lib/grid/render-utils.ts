import * as R from 'ramda';
import type { CellState } from './types';

function createEmptyCell(): CellState {
	return {};
}

function createEmptyRow(size: number): CellState[] {
	return R.times(createEmptyCell, size);
}

function createRow(size: number) {
	return function buildRow(): CellState[] {
		return createEmptyRow(size);
	};
}

export function createEmptyCellGrid(size: number): CellState[][] {
	return R.times(createRow(size), size);
}

function isValidGridPosition(x: number, y: number, size: number): boolean {
	return x >= 0 && x < size && y >= 0 && y < size;
}

function getBoatPosition(
	boat: { startX: number; startY: number; orientation: 'horizontal' | 'vertical' },
	index: number,
) {
	return {
		x: boat.orientation === 'horizontal' ? boat.startX + index : boat.startX,
		y: boat.orientation === 'vertical' ? boat.startY + index : boat.startY,
	};
}

function applyToBoatCell(
	cells: CellState[][],
	boat: { startX: number; startY: number; length: number; orientation: 'horizontal' | 'vertical' },
	size: number,
	index: number,
	applyFn: (cell: CellState) => void,
): void {
	const { x, y } = getBoatPosition(boat, index);
	if (isValidGridPosition(x, y, size)) {
		applyFn(cells[y][x]);
	}
}

function createCellApplier(
	cells: CellState[][],
	boat: { startX: number; startY: number; length: number; orientation: 'horizontal' | 'vertical' },
	size: number,
	applyFn: (cell: CellState) => void,
) {
	return function applyAt(index: number): void {
		applyToBoatCell(cells, boat, size, index, applyFn);
	};
}

export function applyBoatToCells(
	cells: CellState[][],
	boat: { startX: number; startY: number; length: number; orientation: 'horizontal' | 'vertical' },
	size: number,
	applyFn: (cell: CellState) => void,
): void {
	const cellApplier = createCellApplier(cells, boat, size, applyFn);
	R.times(cellApplier, boat.length);
}

function applyShotToCell(cell: CellState, hit: boolean): CellState {
	return {
		...cell,
		shot: true,
		hit,
		miss: !hit,
	};
}

export function applyShotToCells(
	cells: CellState[][],
	shot: { x: number; y: number; hit: boolean },
	size: number,
): void {
	if (isValidGridPosition(shot.x, shot.y, size)) {
		cells[shot.y][shot.x] = applyShotToCell(cells[shot.y][shot.x], shot.hit);
	}
}
