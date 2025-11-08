import type { GridState, Cell, Position, Orientation, Boat } from './types';

export function createEmptyGrid(size: number): GridState {
	const cells = Array(size)
		.fill(null)
		.map(() =>
			Array(size)
				.fill(null)
				.map((): Cell => ({ occupied: false, boatId: null })),
		);
	return { cells, size };
}

export function getCell(grid: GridState, pos: Position): Cell | null {
	if (!isValidPosition(pos, grid.size)) return null;
	return grid.cells[pos.y][pos.x];
}

function setCell(grid: GridState, pos: Position, cell: Cell): GridState {
	if (!isValidPosition(pos, grid.size)) return grid;

	const newCells = grid.cells.map((row, y) =>
		row.map((c, x) => (x === pos.x && y === pos.y ? cell : c)),
	);

	return { ...grid, cells: newCells };
}

export function setCells(grid: GridState, updates: { pos: Position; cell: Cell }[]): GridState {
	let newGrid = grid;
	for (const { pos, cell } of updates) {
		newGrid = setCell(newGrid, pos, cell);
	}
	return newGrid;
}

export function isValidPosition(pos: Position, size: number): boolean {
	return pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size;
}

export function getBoatCells(boat: {
	startX: number;
	startY: number;
	length: number;
	orientation: Orientation;
}): Position[] {
	const cells: Position[] = [];
	for (let i = 0; i < boat.length; i++) {
		cells.push({
			x: boat.orientation === 'horizontal' ? boat.startX + i : boat.startX,
			y: boat.orientation === 'vertical' ? boat.startY + i : boat.startY,
		});
	}
	return cells;
}

export function toggleOrientation(orientation: Orientation): Orientation {
	return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}

export function generateBoatId(): string {
	const array = new Uint32Array(10);
	self.crypto.getRandomValues(array);
	return `boat-${array}`;
}

export function getBoatAt(grid: GridState, boats: Boat[], pos: Position): Boat | null {
	const cell = getCell(grid, pos);
	if (!cell?.boatId) return null;
	return boats.find((b) => b.id === cell.boatId) || null;
}
