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

interface IsValidGridPositionPayload {
	x: number;
	y: number;
	size: number;
}

function isValidGridPosition(payload: IsValidGridPositionPayload): boolean {
	return payload.x >= 0 && payload.x < payload.size && payload.y >= 0 && payload.y < payload.size;
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

interface ApplyToBoatCellPayload {
	cells: CellState[][];
	boat: { startX: number; startY: number; length: number; orientation: 'horizontal' | 'vertical' };
	size: number;
	index: number;
	applyFn: (cell: CellState) => void;
}

function applyToBoatCell(payload: ApplyToBoatCellPayload): void {
	const { cells, boat, size, index, applyFn } = payload;
	const { x, y } = getBoatPosition(boat, index);
	if (isValidGridPosition({ x, y, size })) {
		applyFn(cells[y][x]);
	}
}

interface CreateCellApplierPayload {
	cells: CellState[][];
	boat: { startX: number; startY: number; length: number; orientation: 'horizontal' | 'vertical' };
	size: number;
	applyFn: (cell: CellState) => void;
}

function createCellApplier(payload: CreateCellApplierPayload) {
	return function applyAt(index: number): void {
		applyToBoatCell({
			cells: payload.cells,
			boat: payload.boat,
			size: payload.size,
			index,
			applyFn: payload.applyFn,
		});
	};
}

interface ApplyBoatToCellsPayload {
	cells: CellState[][];
	boat: { startX: number; startY: number; length: number; orientation: 'horizontal' | 'vertical' };
	size: number;
	applyFn: (cell: CellState) => void;
}

export function applyBoatToCells(payload: ApplyBoatToCellsPayload): void {
	const { cells, boat, size, applyFn } = payload;
	const cellApplier = createCellApplier({ cells, boat, size, applyFn });
	R.times(cellApplier, boat.length);
}

interface ApplyShotToCellPayload {
	cell: CellState;
	hit: boolean;
}

function applyShotToCell(payload: ApplyShotToCellPayload): CellState {
	return {
		...payload.cell,
		shot: true,
		hit: payload.hit,
		miss: !payload.hit,
	};
}

interface ApplyShotToCellsPayload {
	cells: CellState[][];
	shot: { x: number; y: number; hit: boolean };
	size: number;
}

export function applyShotToCells(payload: ApplyShotToCellsPayload): void {
	const { cells, shot, size } = payload;
	if (isValidGridPosition({ x: shot.x, y: shot.y, size })) {
		cells[shot.y][shot.x] = applyShotToCell({ cell: cells[shot.y][shot.x], hit: shot.hit });
	}
}
