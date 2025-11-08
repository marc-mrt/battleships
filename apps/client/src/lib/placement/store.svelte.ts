import type { Boat, Position } from '../grid/types';
import { PlacementStateStore } from './placement-state.svelte';
import { DragStateStore } from './drag-state.svelte';
import { renderPlacementCells } from './presenter';
import * as GridOps from '../grid/operations';

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

	get cells() {
		return renderPlacementCells(
			{
				grid: this.placementState.grid,
				boats: this.placementState.boats,
				stock: this.placementState.stock,
			},
			this.placementState.selectedBoatId,
			{
				isDragging: this.dragState.isDragging,
				boatLength: this.dragState.boatLength,
				orientation: this.dragState.orientation,
				hoveredCell: this.dragState.hoveredCell,
				offset: this.dragState.offset,
				originalBoat: this.dragState.originalBoat,
			},
			this.dragState.draggedBoatId,
		);
	}

	startDragFromStock(length: number): void {
		const stockItem = this.placementState.stock.find((s) => s.length === length);
		if (!stockItem || stockItem.placed >= stockItem.count) return;

		this.dragState.startDragFromStock(length);
	}

	startDragFromCell(cellX: number, cellY: number): void {
		const boat = GridOps.getBoatAt(this.placementState.grid, this.placementState.boats, {
			x: cellX,
			y: cellY,
		});
		if (!boat) return;

		this.placementState.selectBoatAt({ x: cellX, y: cellY });
		this.dragState.startDragFromBoat(boat, cellX, cellY);
	}

	setHoveredCell(pos: Position | null): void {
		this.dragState.setHoveredCell(pos);
	}

	endDrag(): void {
		if (!this.dragState.isDragging || !this.dragState.boatLength) {
			this.dragState.endDrag();
			return;
		}

		const hoveredCell = this.dragState.hoveredCell;
		const originalBoat = this.dragState.originalBoat;

		if (hoveredCell) {
			const startX = hoveredCell.x - this.dragState.offset.x;
			const startY = hoveredCell.y - this.dragState.offset.y;

			if (originalBoat) {
				this.placementState.moveBoat(originalBoat.id, startX, startY, this.dragState.orientation);
			} else {
				const newBoat: Boat = {
					id: GridOps.generateBoatId(),
					startX,
					startY,
					length: this.dragState.boatLength,
					orientation: this.dragState.orientation,
				};
				this.placementState.addBoat(newBoat);
			}
		}

		this.dragState.endDrag();
	}

	selectBoat(x: number, y: number): void {
		this.placementState.selectBoatAt({ x, y });
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
