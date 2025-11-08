import type { PlacementUIState, Position, DragState, Boat } from '../grid/types';
import * as PlacementOps from './operations';
import * as GridOps from '../grid/operations';
import { renderPlacementCells } from './presenter';
import { GRID_SIZE } from 'game-rules';

const initialDragState: DragState = {
	isDragging: false,
	boatLength: null,
	orientation: 'horizontal',
	hoveredCell: null,
	offset: { x: 0, y: 0 },
	originalBoat: null,
};

export class PlacementStore {
	private state = $state<PlacementUIState>({
		placement: PlacementOps.createInitialPlacementState(GRID_SIZE),
		drag: { ...initialDragState },
		selectedBoatId: null,
	});

	private draggedBoatId = $state<string | null>(null);

	get boats(): Boat[] {
		return this.state.placement.boats;
	}

	get stock() {
		return this.state.placement.stock;
	}

	get isComplete(): boolean {
		return PlacementOps.isPlacementComplete(this.state.placement);
	}

	get selectedBoatId(): string | null {
		return this.state.selectedBoatId;
	}

	get isDragging(): boolean {
		return this.state.drag.isDragging;
	}

	get cells() {
		return renderPlacementCells(
			this.state.placement,
			this.state.selectedBoatId,
			this.state.drag,
			this.draggedBoatId,
		);
	}

	startDragFromStock(length: number): void {
		const stockItem = this.state.placement.stock.find((s) => s.length === length);
		if (!stockItem || stockItem.placed >= stockItem.count) return;

		this.state.drag = {
			isDragging: true,
			boatLength: length,
			orientation: 'horizontal',
			hoveredCell: null,
			offset: { x: 0, y: 0 },
			originalBoat: null,
		};
	}

	startDragFromCell(cellX: number, cellY: number): void {
		const cell = GridOps.getCell(this.state.placement.grid, { x: cellX, y: cellY });
		if (!cell?.boatId) return;

		const boat = this.state.placement.boats.find((b) => b.id === cell.boatId);
		if (!boat) return;

		this.draggedBoatId = boat.id;
		this.state.selectedBoatId = boat.id;
		this.state.drag = {
			isDragging: true,
			boatLength: boat.length,
			orientation: boat.orientation,
			hoveredCell: null,
			offset: { x: cellX - boat.startX, y: cellY - boat.startY },
			originalBoat: boat,
		};
	}

	setHoveredCell(pos: Position | null): void {
		this.state.drag = { ...this.state.drag, hoveredCell: pos };
	}

	endDrag(): void {
		if (!this.state.drag.isDragging || !this.state.drag.boatLength) {
			this.state.drag = { ...initialDragState };
			this.draggedBoatId = null;
			return;
		}

		const hoveredCell = this.state.drag.hoveredCell;
		const originalBoat = this.state.drag.originalBoat;

		if (hoveredCell) {
			const startX = hoveredCell.x - this.state.drag.offset.x;
			const startY = hoveredCell.y - this.state.drag.offset.y;

			if (originalBoat) {
				const newState = PlacementOps.moveBoat(
					this.state.placement,
					originalBoat.id,
					startX,
					startY,
					this.state.drag.orientation,
				);
				if (newState !== this.state.placement) {
					this.state.placement = newState;
					this.state.selectedBoatId = originalBoat.id;
				}
			} else {
				const newBoat = {
					id: GridOps.generateBoatId(),
					startX,
					startY,
					length: this.state.drag.boatLength,
					orientation: this.state.drag.orientation,
				};
				const newState = PlacementOps.addBoat(this.state.placement, newBoat);
				if (newState !== this.state.placement) {
					this.state.placement = newState;
					this.state.selectedBoatId = newBoat.id;
				}
			}
		}

		this.state.drag = { ...initialDragState };
		this.draggedBoatId = null;
	}

	selectBoat(x: number, y: number): void {
		const cell = GridOps.getCell(this.state.placement.grid, { x, y });
		this.state.selectedBoatId = cell?.boatId || null;
	}

	rotateSelected(): void {
		if (!this.state.selectedBoatId) return;
		this.state.placement = PlacementOps.rotateBoat(this.state.placement, this.state.selectedBoatId);
	}

	deleteSelected(): void {
		if (!this.state.selectedBoatId) return;
		this.state.placement = PlacementOps.removeBoat(this.state.placement, this.state.selectedBoatId);
		this.state.selectedBoatId = null;
	}

	reset(): void {
		this.state = {
			placement: PlacementOps.createInitialPlacementState(GRID_SIZE),
			drag: { ...initialDragState },
			selectedBoatId: null,
		};
		this.draggedBoatId = null;
	}
}
