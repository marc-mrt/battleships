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

function createUpdateMap(updates: { pos: Position; cell: Cell }[]): Map<string, Cell> {
	const map = new Map<string, Cell>();
	updates.forEach((update) => {
		const key = `${update.pos.x},${update.pos.y}`;
		map.set(key, update.cell);
	});
	return map;
}

interface ApplyCellUpdatesInRowPayload {
	row: Cell[];
	y: number;
	updateMap: Map<string, Cell>;
}

function applyCellUpdatesInRow(payload: ApplyCellUpdatesInRowPayload): Cell[] {
	const { row, y, updateMap } = payload;
	return row.map((cell, x) => {
		const key = `${x},${y}`;
		return updateMap.get(key) ?? cell;
	});
}

function applyBatchUpdates(cells: Cell[][], updateMap: Map<string, Cell>): Cell[][] {
	return cells.map((row, y) => applyCellUpdatesInRow({ row, y, updateMap }));
}

export function setCells(grid: GridState, updates: { pos: Position; cell: Cell }[]): GridState {
	if (updates.length === 0) return grid;

	const validUpdates = updates.filter((update) => isValidPosition(update.pos, grid.size));
	if (validUpdates.length === 0) return grid;

	const updateMap = createUpdateMap(validUpdates);
	const newCells = applyBatchUpdates(grid.cells, updateMap);

	return { ...grid, cells: newCells };
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

const BOAT_ID_BYTE_LENGTH = 10;
const BOAT_ID_PREFIX = 'boat';

function generateRandomBytes(length: number): Uint32Array {
	const array = new Uint32Array(length);
	self.crypto.getRandomValues(array);
	return array;
}

export function generateBoatId(): string {
	const array = generateRandomBytes(BOAT_ID_BYTE_LENGTH);
	return `${BOAT_ID_PREFIX}-${array}`;
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
