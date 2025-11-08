import type { PlacementState, Boat } from '../grid/types';
import {
	getBoatCells,
	isValidPosition,
	getCell,
	setCells,
	createEmptyGrid,
} from '../grid/operations';
import { BOATS_CONFIGURATION } from 'game-rules';

export function createInitialPlacementState(size: number): PlacementState {
	return {
		grid: createEmptyGrid(size),
		boats: [],
		stock: BOATS_CONFIGURATION.map((config) => ({
			...config,
			placed: 0,
		})),
	};
}

export function canPlaceBoat(state: PlacementState, boat: Boat, excludeBoatId?: string): boolean {
	const cells = getBoatCells(boat);
	return cells.every((pos) => {
		if (!isValidPosition(pos, state.grid.size)) return false;
		const cell = getCell(state.grid, pos);
		return cell && (!cell.occupied || cell.boatId === excludeBoatId);
	});
}

export function addBoat(state: PlacementState, boat: Boat): PlacementState {
	const stockItem = state.stock.find((s) => s.length === boat.length);
	if (!stockItem || stockItem.placed >= stockItem.count) return state;
	if (!canPlaceBoat(state, boat)) return state;

	const cells = getBoatCells(boat);
	const updates = cells.map((pos) => ({
		pos,
		cell: { occupied: true, boatId: boat.id },
	}));

	return {
		...state,
		grid: setCells(state.grid, updates),
		boats: [...state.boats, boat],
		stock: state.stock.map((s) => (s.length === boat.length ? { ...s, placed: s.placed + 1 } : s)),
	};
}

export function removeBoat(state: PlacementState, boatId: string): PlacementState {
	const boat = state.boats.find((b) => b.id === boatId);
	if (!boat) return state;

	const cells = getBoatCells(boat);
	const updates = cells.map((pos) => ({
		pos,
		cell: { occupied: false, boatId: null },
	}));

	return {
		...state,
		grid: setCells(state.grid, updates),
		boats: state.boats.filter((b) => b.id !== boatId),
		stock: state.stock.map((s) => (s.length === boat.length ? { ...s, placed: s.placed - 1 } : s)),
	};
}

export function moveBoat(
	state: PlacementState,
	boatId: string,
	startX: number,
	startY: number,
	orientation: 'horizontal' | 'vertical',
): PlacementState {
	const boat = state.boats.find((b) => b.id === boatId);
	if (!boat) return state;

	const updatedBoat = { ...boat, startX, startY, orientation };
	if (!canPlaceBoat(state, updatedBoat, boatId)) return state;

	const oldCells = getBoatCells(boat);
	const removeUpdates = oldCells.map((pos) => ({
		pos,
		cell: { occupied: false, boatId: null },
	}));

	const newCells = getBoatCells(updatedBoat);
	const addUpdates = newCells.map((pos) => ({
		pos,
		cell: { occupied: true, boatId: boat.id },
	}));

	return {
		...state,
		grid: setCells(setCells(state.grid, removeUpdates), addUpdates),
		boats: state.boats.map((b) => (b.id === boatId ? updatedBoat : b)),
	};
}

export function rotateBoat(state: PlacementState, boatId: string): PlacementState {
	const boat = state.boats.find((b) => b.id === boatId);
	if (!boat) return state;

	const newOrientation = boat.orientation === 'horizontal' ? 'vertical' : 'horizontal';
	return moveBoat(state, boatId, boat.startX, boat.startY, newOrientation);
}

export function isPlacementComplete(state: PlacementState): boolean {
	return state.stock.every((s) => s.placed === s.count);
}

export function getBoatAt(state: PlacementState, x: number, y: number): Boat | null {
	const cell = getCell(state.grid, { x, y });
	if (!cell?.boatId) return null;
	return state.boats.find((b) => b.id === cell.boatId) || null;
}
