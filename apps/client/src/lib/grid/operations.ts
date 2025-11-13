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

interface ShouldReplaceCellPayload {
	x: number;
	y: number;
	posX: number;
	posY: number;
}

function shouldReplaceCell(payload: ShouldReplaceCellPayload): boolean {
	return payload.x === payload.posX && payload.y === payload.posY;
}

interface ReplaceIfMatchPayload {
	y: number;
	posX: number;
	posY: number;
	cell: Cell;
}

function replaceIfMatch(payload: ReplaceIfMatchPayload) {
	return function replace(c: Cell, currentX: number): Cell {
		return shouldReplaceCell({ x: currentX, y: payload.y, posX: payload.posX, posY: payload.posY })
			? payload.cell
			: c;
	};
}

interface UpdateCellInRowPayload {
	row: Cell[];
	x: number;
	y: number;
	posX: number;
	posY: number;
	cell: Cell;
}

function updateCellInRow(payload: UpdateCellInRowPayload): Cell[] {
	return payload.row.map(
		replaceIfMatch({ y: payload.y, posX: payload.posX, posY: payload.posY, cell: payload.cell }),
	);
}

function updateRow(pos: Position, cell: Cell) {
	return function update(row: Cell[], y: number): Cell[] {
		return updateCellInRow({ row, x: pos.x, y, posX: pos.x, posY: pos.y, cell });
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

interface BoatPositionInfo {
	startX: number;
	startY: number;
	orientation: Orientation;
}

function calculateCellX(boat: BoatPositionInfo, index: number): number {
	return boat.orientation === 'horizontal' ? boat.startX + index : boat.startX;
}

function calculateCellY(boat: BoatPositionInfo, index: number): number {
	return boat.orientation === 'vertical' ? boat.startY + index : boat.startY;
}

interface CreateBoatCellPositionPayload {
	boat: BoatPositionInfo;
	index: number;
}

function createBoatCellPosition(payload: CreateBoatCellPositionPayload): Position {
	return {
		x: calculateCellX(payload.boat, payload.index),
		y: calculateCellY(payload.boat, payload.index),
	};
}

function createBoatCellAtIndex(boat: BoatPositionInfo) {
	return function createCell(index: number): Position {
		return createBoatCellPosition({ boat, index });
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

function findBoatById(boatId: string) {
	return function findInBoats(boats: Boat[]): Boat | null {
		return boats.find(isBoatWithId(boatId)) || null;
	};
}

interface GetBoatAtPayload {
	grid: GridState;
	boats: Boat[];
	pos: Position;
}

export function getBoatAt(payload: GetBoatAtPayload): Boat | null {
	const { grid, boats, pos } = payload;
	const cell = getCell(grid, pos);
	if (!cell?.boatId) return null;
	return findBoatById(cell.boatId)(boats);
}
