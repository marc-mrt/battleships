import type { BoatPlacement } from 'game-messages';

export const GRID_SIZE = 9;

export const BOAT_TYPES = [
	{ length: 5, count: 1 },
	{ length: 4, count: 1 },
	{ length: 3, count: 2 },
	{ length: 2, count: 1 },
] as const;

export type Cell = { occupied: boolean; boatId: string | null };
export type Orientation = 'horizontal' | 'vertical';
export type Position = { x: number; y: number };

export function generateBoatId(): string {
	const array = new Uint32Array(10);
	self.crypto.getRandomValues(array);
	return `boat-${array}`;
}

export function getBoatCells(boat: BoatPlacement): Position[] {
	const cells: Position[] = [];
	for (let i = 0; i < boat.length; i++) {
		cells.push({
			x: boat.orientation === 'horizontal' ? boat.startX + i : boat.startX,
			y: boat.orientation === 'vertical' ? boat.startY + i : boat.startY,
		});
	}
	return cells;
}

export function isPositionValid(pos: Position): boolean {
	return pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE;
}

export function canPlaceBoat(
	grid: Cell[][],
	x: number,
	y: number,
	length: number,
	orientation: Orientation,
	excludeBoatId?: string | null,
): boolean {
	if (!isPositionValid({ x, y })) return false;

	const endX = orientation === 'horizontal' ? x + length - 1 : x;
	const endY = orientation === 'vertical' ? y + length - 1 : y;

	if (!isPositionValid({ x: endX, y: endY })) return false;

	for (let i = 0; i < length; i++) {
		const cellX = orientation === 'horizontal' ? x + i : x;
		const cellY = orientation === 'vertical' ? y + i : y;
		const cell = grid[cellY][cellX];

		if (cell.occupied && cell.boatId !== excludeBoatId) {
			return false;
		}
	}
	return true;
}

export function toggleOrientation(orientation: Orientation): Orientation {
	return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}
