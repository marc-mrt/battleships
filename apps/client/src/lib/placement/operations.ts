import * as R from 'ramda';
import type { PlacementState, Boat } from '../grid/types';
import {
	getBoatCells,
	isValidPosition,
	getCell,
	setCells,
	createEmptyGrid,
} from '../grid/operations';
import { BOATS_CONFIGURATION } from 'game-rules';

function updateStockItem(
	stockItem: { length: number; count: number; placed: number },
	length: number,
	delta: number,
): { length: number; count: number; placed: number } {
	if (stockItem.length === length) {
		return { ...stockItem, placed: stockItem.placed + delta };
	}
	return stockItem;
}

function updateStockPlaced(length: number, delta: number) {
	return function updateStock(stockItem: { length: number; count: number; placed: number }) {
		return updateStockItem(stockItem, length, delta);
	};
}

function updateStockCount(length: number, delta: number) {
	return R.map(updateStockPlaced(length, delta));
}

function addPlacedCount(config: { length: number; count: number }) {
	return { ...config, placed: 0 };
}

export function createInitialPlacementState(size: number): PlacementState {
	return {
		grid: createEmptyGrid(size),
		boats: [],
		stock: BOATS_CONFIGURATION.map(addPlacedCount),
	};
}

function isCellAvailableForBoat(
	state: PlacementState,
	pos: { x: number; y: number },
	excludeBoatId?: string,
): boolean {
	if (!isValidPosition(pos, state.grid.size)) {
		return false;
	}
	const cell = getCell(state.grid, pos);
	if (!cell) {
		return false;
	}
	if (!cell.occupied) {
		return true;
	}
	return cell.boatId === excludeBoatId;
}

function checkCellAvailability(state: PlacementState, excludeBoatId?: string) {
	return function checkCell(pos: { x: number; y: number }): boolean {
		return isCellAvailableForBoat(state, pos, excludeBoatId);
	};
}

export function canPlaceBoat(state: PlacementState, boat: Boat, excludeBoatId?: string): boolean {
	const cells = getBoatCells(boat);
	return cells.every(checkCellAvailability(state, excludeBoatId));
}

function hasLength(length: number) {
	return function matchLength(s: { length: number }): boolean {
		return s.length === length;
	};
}

function findStockItem(state: PlacementState, length: number) {
	return state.stock.find(hasLength(length));
}

function isStockAvailable(stockItem: { placed: number; count: number } | undefined): boolean {
	return stockItem !== undefined && stockItem.placed < stockItem.count;
}

function createOccupiedCell(boatId: string) {
	return { occupied: true, boatId };
}

function createEmptyCell() {
	return { occupied: false, boatId: null };
}

function createCellUpdate(pos: { x: number; y: number }, boatId: string) {
	return { pos, cell: createOccupiedCell(boatId) };
}

function createClearUpdate(pos: { x: number; y: number }) {
	return { pos, cell: createEmptyCell() };
}

function createBoatCellUpdate(pos: { x: number; y: number }, boatId: string) {
	return createCellUpdate(pos, boatId);
}

function createUpdateForBoat(boatId: string) {
	return function createUpdate(pos: { x: number; y: number }) {
		return createBoatCellUpdate(pos, boatId);
	};
}

export function addBoat(state: PlacementState, boat: Boat): PlacementState {
	const stockItem = findStockItem(state, boat.length);
	if (!isStockAvailable(stockItem)) {
		return state;
	}
	if (!canPlaceBoat(state, boat)) {
		return state;
	}

	const cells = getBoatCells(boat);
	const updates = R.map(createUpdateForBoat(boat.id), cells);

	return {
		...state,
		grid: setCells(state.grid, updates),
		boats: [...state.boats, boat],
		stock: updateStockCount(boat.length, 1)(state.stock),
	};
}

function hasBoatId(boatId: string) {
	return function matchesId(b: Boat): boolean {
		return b.id === boatId;
	};
}

function isNotBoatId(boatId: string) {
	return function doesNotMatch(b: Boat): boolean {
		return b.id !== boatId;
	};
}

function findBoat(state: PlacementState, boatId: string): Boat | undefined {
	return state.boats.find(hasBoatId(boatId));
}

function removeBoatFromList(boats: Boat[], boatId: string): Boat[] {
	return boats.filter(isNotBoatId(boatId));
}

export function removeBoat(state: PlacementState, boatId: string): PlacementState {
	const boat = findBoat(state, boatId);
	if (!boat) {
		return state;
	}

	const cells = getBoatCells(boat);
	const updates = R.map(createClearUpdate, cells);

	return {
		...state,
		grid: setCells(state.grid, updates),
		boats: removeBoatFromList(state.boats, boatId),
		stock: updateStockCount(boat.length, -1)(state.stock),
	};
}

function createUpdatedBoat(
	boat: Boat,
	startX: number,
	startY: number,
	orientation: 'horizontal' | 'vertical',
): Boat {
	return { ...boat, startX, startY, orientation };
}

function replaceIfMatches(boatId: string, updatedBoat: Boat) {
	return function replace(b: Boat): Boat {
		return b.id === boatId ? updatedBoat : b;
	};
}

function replaceBoat(boats: Boat[], boatId: string, updatedBoat: Boat): Boat[] {
	return boats.map(replaceIfMatches(boatId, updatedBoat));
}

export function moveBoat(
	state: PlacementState,
	boatId: string,
	startX: number,
	startY: number,
	orientation: 'horizontal' | 'vertical',
): PlacementState {
	const boat = findBoat(state, boatId);
	if (!boat) {
		return state;
	}

	const updatedBoat = createUpdatedBoat(boat, startX, startY, orientation);
	if (!canPlaceBoat(state, updatedBoat, boatId)) {
		return state;
	}

	const oldCells = getBoatCells(boat);
	const removeUpdates = R.map(createClearUpdate, oldCells);

	const newCells = getBoatCells(updatedBoat);
	const addUpdates = R.map(createUpdateForBoat(boat.id), newCells);

	return {
		...state,
		grid: setCells(setCells(state.grid, removeUpdates), addUpdates),
		boats: replaceBoat(state.boats, boatId, updatedBoat),
	};
}

function toggleBoatOrientation(orientation: 'horizontal' | 'vertical'): 'horizontal' | 'vertical' {
	return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}

export function rotateBoat(state: PlacementState, boatId: string): PlacementState {
	const boat = findBoat(state, boatId);
	if (!boat) {
		return state;
	}

	const newOrientation = toggleBoatOrientation(boat.orientation);
	return moveBoat(state, boatId, boat.startX, boat.startY, newOrientation);
}

function isStockComplete(stockItem: { placed: number; count: number }): boolean {
	return stockItem.placed === stockItem.count;
}

export function isPlacementComplete(state: PlacementState): boolean {
	return state.stock.every(isStockComplete);
}

export function getBoatAt(state: PlacementState, x: number, y: number): Boat | null {
	const position = { x, y };
	const cell = getCell(state.grid, position);
	if (!cell?.boatId) {
		return null;
	}
	return findBoat(state, cell.boatId) || null;
}
