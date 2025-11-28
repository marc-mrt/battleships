import * as R from 'ramda';
import type { GridState, Cell, Position, Orientation, Boat } from './types';

function createEmptyCell(): Cell {
	return { occupied: false, boatId: null };
}

function createEmptyRow(size: number): Cell[] {
	return R.times(createEmptyCell, size);
}

export function createEmptyGrid(size: number): GridState {
	return {
		cells: R.times(() => createEmptyRow(size), size),
		size,
	};
}

export function getCell(grid: GridState, pos: Position): Cell | null {
	if (!isValidPosition(pos, grid.size)) {
		return null;
	}
	return grid.cells[pos.y][pos.x];
}

function setCell(grid: GridState, update: { pos: Position; cell: Cell }): GridState {
	if (!isValidPosition(update.pos, grid.size)) {
		return grid;
	}

	const newCells = R.map((row) => [...row], grid.cells);
	newCells[update.pos.y][update.pos.x] = update.cell;

	return { ...grid, cells: newCells };
}

export function setCells(grid: GridState, updates: { pos: Position; cell: Cell }[]): GridState {
	return R.reduce(setCell, grid, updates);
}

export function isValidPosition(pos: Position, size: number): boolean {
	return pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size;
}

function calculateBoatPosition(boat: { startX: number; startY: number; orientation: Orientation }) {
	return (index: number): Position => ({
		x: boat.orientation === 'horizontal' ? boat.startX + index : boat.startX,
		y: boat.orientation === 'vertical' ? boat.startY + index : boat.startY,
	});
}

export function getBoatCells(boat: {
	startX: number;
	startY: number;
	length: number;
	orientation: Orientation;
}): Position[] {
	return R.times(calculateBoatPosition(boat), boat.length);
}

const BOAT_ID_BYTE_LENGTH = 10;
const BOAT_ID_PREFIX = 'boat';

export function generateBoatId(): string {
	const array = new Uint32Array(BOAT_ID_BYTE_LENGTH);
	self.crypto.getRandomValues(array);
	return `${BOAT_ID_PREFIX}-${array}`;
}

export function getBoatAt(grid: GridState, boats: Boat[], pos: Position): Boat | null {
	const cell = getCell(grid, pos);
	if (!cell?.boatId) {
		return null;
	}
	return R.find(R.propEq(cell.boatId, 'id'), boats) || null;
}
