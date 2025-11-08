import type { Position, Boat, Orientation } from '../grid/types';

type DragState = {
	isDragging: boolean;
	boatLength: number | null;
	orientation: Orientation;
	hoveredCell: Position | null;
	offset: Position;
	originalBoat: Boat | null;
};

const initialDragState: DragState = {
	isDragging: false,
	boatLength: null,
	orientation: 'horizontal',
	hoveredCell: null,
	offset: { x: 0, y: 0 },
	originalBoat: null,
};

export class DragStateStore {
	private state = $state<DragState>({ ...initialDragState });
	private draggedBoat = $state<string | null>(null);

	get isDragging(): boolean {
		return this.state.isDragging;
	}

	get boatLength(): number | null {
		return this.state.boatLength;
	}

	get orientation(): Orientation {
		return this.state.orientation;
	}

	get hoveredCell(): Position | null {
		return this.state.hoveredCell;
	}

	get offset(): Position {
		return this.state.offset;
	}

	get originalBoat(): Boat | null {
		return this.state.originalBoat;
	}

	get draggedBoatId(): string | null {
		return this.draggedBoat;
	}

	startDragFromStock(length: number): void {
		this.state = {
			isDragging: true,
			boatLength: length,
			orientation: 'horizontal',
			hoveredCell: null,
			offset: { x: 0, y: 0 },
			originalBoat: null,
		};
		this.draggedBoat = null;
	}

	startDragFromBoat(boat: Boat, cellX: number, cellY: number): void {
		this.state = {
			isDragging: true,
			boatLength: boat.length,
			orientation: boat.orientation,
			hoveredCell: null,
			offset: { x: cellX - boat.startX, y: cellY - boat.startY },
			originalBoat: boat,
		};
		this.draggedBoat = boat.id;
	}

	setHoveredCell(pos: Position | null): void {
		this.state.hoveredCell = pos;
	}

	endDrag(): void {
		this.state = { ...initialDragState };
		this.draggedBoat = null;
	}

	reset(): void {
		this.state = { ...initialDragState };
		this.draggedBoat = null;
	}
}
