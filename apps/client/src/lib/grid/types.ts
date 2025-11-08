export type Position = { x: number; y: number };

export type Orientation = 'horizontal' | 'vertical';

export type Boat = {
	id: string;
	startX: number;
	startY: number;
	length: number;
	orientation: Orientation;
};

export type Cell = {
	occupied: boolean;
	boatId: string | null;
};

export type BoatStock = {
	length: number;
	count: number;
	placed: number;
};

export type Shot = {
	x: number;
	y: number;
	hit: boolean;
};

export type GridState = {
	cells: Cell[][];
	size: number;
};

export type PlacementState = {
	grid: GridState;
	boats: Boat[];
	stock: BoatStock[];
};

export type DragState = {
	isDragging: boolean;
	boatLength: number | null;
	orientation: Orientation;
	hoveredCell: Position | null;
	offset: Position;
	originalBoat: Boat | null;
};

export type PlacementUIState = {
	placement: PlacementState;
	drag: DragState;
	selectedBoatId: string | null;
};

export type CellState = {
	boat?: boolean;
	shot?: boolean;
	hit?: boolean;
	miss?: boolean;
	sunk?: boolean;
	selected?: boolean;
	preview?: boolean;
	validDrop?: boolean;
	invalidDrop?: boolean;
};
