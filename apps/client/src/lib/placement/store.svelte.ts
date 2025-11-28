import type { Boat, Position } from '../grid/types';
import { PlacementStateStore } from './placement-state.svelte';
import { DragStateStore } from './drag-state.svelte';
import { renderPlacementCells } from './presenter';
import * as GridOps from '../grid/operations';

function hasMatchingLength(length: number) {
	return function matchLength(s: { length: number; count: number; placed: number }): boolean {
		return s.length === length;
	};
}

function isStockItemAvailable(stockItem: { placed: number; count: number } | undefined): boolean {
	return stockItem !== undefined && stockItem.placed < stockItem.count;
}

export class PlacementStore {
	private placementState = new PlacementStateStore();
	private dragState = new DragStateStore();

	get boats(): Boat[] {
		return this.placementState.boats;
	}

	get stock() {
		return this.placementState.stock;
	}

	get isComplete(): boolean {
		return this.placementState.isComplete;
	}

	get selectedBoatId(): string | null {
		return this.placementState.selectedBoatId;
	}

	get isDragging(): boolean {
		return this.dragState.isDragging;
	}

	get draggedBoatLength(): number {
		return this.dragState.boatLength ?? 0;
	}

	get draggedBoatOrientation(): 'horizontal' | 'vertical' {
		return this.dragState.orientation;
	}

	get cells() {
		return renderPlacementCells({
			state: {
				grid: this.placementState.grid,
				boats: this.placementState.boats,
				stock: this.placementState.stock,
			},
			selectedBoatId: this.placementState.selectedBoatId,
			drag: {
				isDragging: this.dragState.isDragging,
				boatLength: this.dragState.boatLength,
				orientation: this.dragState.orientation,
				hoveredCell: this.dragState.hoveredCell,
				offset: this.dragState.offset,
				originalBoat: this.dragState.originalBoat,
			},
			draggedBoatId: this.dragState.draggedBoatId,
		});
	}

	startDragFromStock(length: number): void {
		const stockItem = this.placementState.stock.find(hasMatchingLength(length));
		if (!isStockItemAvailable(stockItem)) return;

		this.dragState.startDragFromStock(length);
	}

	startDragFromCell(cellX: number, cellY: number): void {
		const position = { x: cellX, y: cellY };
		const boat = GridOps.getBoatAt(this.placementState.grid, this.placementState.boats, position);
		if (!boat) return;

		this.placementState.selectBoatAt(position);
		this.dragState.startDragFromBoat(boat, cellX, cellY);
	}

	setHoveredCell(pos: Position | null): void {
		this.dragState.setHoveredCell(pos);
	}

	endDrag(): void {
		const boatLength = this.dragState.boatLength;
		const cannotDrop = !this.dragState.isDragging || !boatLength;
		if (cannotDrop) {
			this.dragState.endDrag();
			return;
		}

		const hoveredCell = this.dragState.hoveredCell;
		if (!hoveredCell) {
			this.dragState.endDrag();
			return;
		}

		const startX = hoveredCell.x - this.dragState.offset.x;
		const startY = hoveredCell.y - this.dragState.offset.y;
		const originalBoat = this.dragState.originalBoat;

		if (originalBoat) {
			this.placementState.moveBoat(originalBoat.id, startX, startY, this.dragState.orientation);
		} else {
			const newBoat: Boat = {
				id: GridOps.generateBoatId(),
				startX,
				startY,
				length: boatLength,
				orientation: this.dragState.orientation,
			};
			this.placementState.addBoat(newBoat);
		}

		this.dragState.endDrag();
	}

	selectBoat(x: number, y: number): void {
		const position = { x, y };
		this.placementState.selectBoatAt(position);
	}

	rotateSelected(): void {
		const selectedId = this.placementState.selectedBoatId;
		if (!selectedId) return;
		this.placementState.rotateBoat(selectedId);
	}

	deleteSelected(): void {
		const selectedId = this.placementState.selectedBoatId;
		if (!selectedId) return;
		this.placementState.removeBoat(selectedId);
	}

	reset(): void {
		this.placementState.reset();
		this.dragState.reset();
	}
}
