import type { CellState } from './types';

export function createEmptyCellGrid(size: number): CellState[][] {
	return Array.from({ length: size }, () =>
		Array.from({ length: size }, () => ({})),
	);
}

export function isValidGridPosition(x: number, y: number, size: number): boolean {
	return x >= 0 && x < size && y >= 0 && y < size;
}

export function applyBoatToCells(
	cells: CellState[][],
	boat: { startX: number; startY: number; length: number; orientation: 'horizontal' | 'vertical' },
	size: number,
	applyFn: (cell: CellState) => void,
): void {
	for (let i = 0; i < boat.length; i++) {
		const x = boat.orientation === 'horizontal' ? boat.startX + i : boat.startX;
		const y = boat.orientation === 'vertical' ? boat.startY + i : boat.startY;
		if (isValidGridPosition(x, y, size)) {
			applyFn(cells[y][x]);
		}
	}
}

export function applyShotToCells(
	cells: CellState[][],
	shot: { x: number; y: number; hit: boolean },
	size: number,
): void {
	if (isValidGridPosition(shot.x, shot.y, size)) {
		cells[shot.y][shot.x].shot = true;
		cells[shot.y][shot.x].hit = shot.hit;
		cells[shot.y][shot.x].miss = !shot.hit;
	}
}
