import * as R from 'ramda';
import type { GridState, Cell, Position, Orientation, Boat } from './types';

function createEmptyCell(): Cell {
	return { occupied: false, boatId: null };
}

function createEmptyRow(size: number): Cell[] {
	return R.times(createEmptyCell, size);
}

function createRow(size: number) {
	return function buildRow(): Cell[] {
		return createEmptyRow(size);
	};
}

export function createEmptyGrid(size: number): GridState {
	return {
		cells: R.times(createRow(size), size),
		size,
	};
}

export function getCell(grid: GridState, pos: Position): Cell | null {
	if (!isValidPosition(pos, grid.size)) return null;
	return grid.cells[pos.y][pos.x];
}

function shouldReplaceCell(x: number, y: number, posX: number, posY: number): boolean {
	return x === posX && y === posY;
}

function replaceIfMatch(y: number, posX: number, posY: number, cell: Cell) {
	return function replace(c: Cell, currentX: number): Cell {
		return shouldReplaceCell(currentX, y, posX, posY) ? cell : c;
	};
}

function updateCellInRow(
	row: Cell[],
	x: number,
	y: number,
	posX: number,
	posY: number,
	cell: Cell,
): Cell[] {
	return row.map(replaceIfMatch(y, posX, posY, cell));
}

function updateRow(pos: Position, cell: Cell) {
	return function update(row: Cell[], y: number): Cell[] {
		return updateCellInRow(row, pos.x, y, pos.x, pos.y, cell);
	};
}

function setCell(grid: GridState, pos: Position, cell: Cell): GridState {
	if (!isValidPosition(pos, grid.size)) return grid;

	const newCells = grid.cells.map(updateRow(pos, cell));

	return { ...grid, cells: newCells };
}

function applyCellUpdate(grid: GridState, update: { pos: Position; cell: Cell }): GridState {
	return setCell(grid, update.pos, update.cell);
}

export function setCells(grid: GridState, updates: { pos: Position; cell: Cell }[]): GridState {
	return R.reduce(applyCellUpdate, grid, updates);
}

export function isValidPosition(pos: Position, size: number): boolean {
	return pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size;
}

function calculateCellX(boat: { startX: number; orientation: Orientation }, index: number): number {
	return boat.orientation === 'horizontal' ? boat.startX + index : boat.startX;
}

function calculateCellY(boat: { startY: number; orientation: Orientation }, index: number): number {
	return boat.orientation === 'vertical' ? boat.startY + index : boat.startY;
}

function createBoatCellPosition(
	boat: {
		startX: number;
		startY: number;
		orientation: Orientation;
	},
	index: number,
): Position {
	return {
		x: calculateCellX(boat, index),
		y: calculateCellY(boat, index),
	};
}

function createBoatCellAtIndex(boat: { startX: number; startY: number; orientation: Orientation }) {
	return function createCell(index: number): Position {
		return createBoatCellPosition(boat, index);
	};
}

export function getBoatCells(boat: {
	startX: number;
	startY: number;
	length: number;
	orientation: Orientation;
}): Position[] {
	return R.times(createBoatCellAtIndex(boat), boat.length);
}

export function toggleOrientation(orientation: Orientation): Orientation {
	return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}

function generateRandomArray(): Uint32Array {
	const array = new Uint32Array(10);
	self.crypto.getRandomValues(array);
	return array;
}

export function generateBoatId(): string {
	const array = generateRandomArray();
	return `boat-${array}`;
}

function isBoatWithId(boatId: string) {
	return function matchesId(boat: Boat): boolean {
		return boat.id === boatId;
	};
}

function findBoatById(boats: Boat[], boatId: string): Boat | null {
	return boats.find(isBoatWithId(boatId)) || null;
}

export function getBoatAt(grid: GridState, boats: Boat[], pos: Position): Boat | null {
	const cell = getCell(grid, pos);
	if (!cell?.boatId) return null;
	return findBoatById(boats, cell.boatId);
}
