import { GRID_SIZE } from 'game-rules';

export type Position = { x: number; y: number };

export type BoatLike = {
	startX: number;
	startY: number;
	length: number;
	orientation: 'horizontal' | 'vertical';
};

export function getBoatCells(boat: BoatLike): Position[] {
	const cells: Position[] = [];
	for (let i = 0; i < boat.length; i++) {
		cells.push({
			x: boat.orientation === 'horizontal' ? boat.startX + i : boat.startX,
			y: boat.orientation === 'vertical' ? boat.startY + i : boat.startY,
		});
	}
	return cells;
}

export function isValidPosition(pos: Position, gridSize: number = GRID_SIZE): boolean {
	return pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize;
}

export function generateBoatId(): string {
	const array = new Uint32Array(10);
	self.crypto.getRandomValues(array);
	return `boat-${array}`;
}

export function toggleOrientation(
	orientation: 'horizontal' | 'vertical',
): 'horizontal' | 'vertical' {
	return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}
