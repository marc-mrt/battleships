import { BOATS_CONFIGURATION, TOTAL_BOATS_COUNT } from 'game-rules';
import {
	PlacementGrid,
	type CellState,
	type PreviewOptions,
} from '../domain/placement-grid.svelte';

type Orientation = 'horizontal' | 'vertical';
type Position = { x: number; y: number };

export class PlaceBoatsState {
	private placementGrid = new PlacementGrid();

	dragState = $state({
		boatLength: null as number | null,
		orientation: 'horizontal' as Orientation,
		hoveredCell: null as Position | null,
		isDragging: false,
		boatId: null as string | null,
		offset: { x: 0, y: 0 },
	});

	selectedBoatId = $state<string | null>(null);

	canSubmit = $derived(this.placementGrid.isComplete());
	boats = $derived(this.placementGrid.getBoats());
	boatStock = $derived(this.placementGrid.getStock());
	totalBoatsRequired = TOTAL_BOATS_COUNT;
	boatTypes = BOATS_CONFIGURATION;

	gridCells = $derived.by((): CellState[][] => {
		const preview: PreviewOptions | null =
			this.dragState.isDragging && this.dragState.boatLength && this.dragState.hoveredCell
				? {
						hoveredX: this.dragState.hoveredCell.x,
						hoveredY: this.dragState.hoveredCell.y,
						boatLength: this.dragState.boatLength,
						orientation: this.dragState.orientation,
						offsetX: this.dragState.offset.x,
						offsetY: this.dragState.offset.y,
						draggedBoatId: this.dragState.boatId,
					}
				: null;

		return this.placementGrid.toPlacementDisplayGrid(this.selectedBoatId, preview);
	});

	startDrag(length: number, fromStock = true, boatId?: string, cellX?: number, cellY?: number) {
		if (fromStock) {
			this.startDragFromStock(length);
		} else if (boatId && cellX !== undefined && cellY !== undefined) {
			this.startDragFromGrid(boatId, cellX, cellY);
		}
	}

	private startDragFromStock(length: number): void {
		const stockItem = this.boatStock.find((s) => s.length === length);
		if (!stockItem || stockItem.placed >= stockItem.count) return;

		this.dragState = {
			boatLength: length,
			orientation: 'horizontal',
			hoveredCell: null,
			isDragging: true,
			boatId: null,
			offset: { x: 0, y: 0 },
		};
	}

	private startDragFromGrid(boatId: string, cellX: number, cellY: number): void {
		const boat = this.placementGrid.getBoat(boatId);
		if (!boat) return;

		this.placementGrid.removeBoatById(boatId);
		this.selectedBoatId = boatId;

		this.dragState = {
			boatLength: boat.length,
			orientation: boat.orientation,
			hoveredCell: null,
			isDragging: true,
			boatId: boatId,
			offset: { x: cellX - boat.startX, y: cellY - boat.startY },
		};
	}

	endDrag() {
		if (this.dragState.hoveredCell && this.dragState.boatLength) {
			const startX = this.dragState.hoveredCell.x - this.dragState.offset.x;
			const startY = this.dragState.hoveredCell.y - this.dragState.offset.y;

			if (this.dragState.boatId) {
				const boat = this.placementGrid.getBoat(this.dragState.boatId);
				if (boat) {
					const moved = this.placementGrid.moveBoat(
						this.dragState.boatId,
						startX,
						startY,
						this.dragState.orientation,
					);
					if (!moved) {
						this.placementGrid.addBoat(boat);
					}
				}
			} else {
				const newBoatId = this.placementGrid.placeNewBoat(
					startX,
					startY,
					this.dragState.boatLength,
					this.dragState.orientation,
				);
				if (newBoatId) {
					this.selectedBoatId = newBoatId;
				}
			}
		} else if (this.dragState.boatId) {
			const boat = this.placementGrid.getBoat(this.dragState.boatId);
			if (boat) {
				this.placementGrid.addBoat(boat);
			}
		}

		this.dragState = {
			boatLength: null,
			orientation: 'horizontal',
			hoveredCell: null,
			isDragging: false,
			boatId: null,
			offset: { x: 0, y: 0 },
		};
	}

	rotateSelectedBoat() {
		if (!this.selectedBoatId) return;
		this.placementGrid.rotateBoat(this.selectedBoatId);
	}

	deleteSelectedBoat() {
		if (!this.selectedBoatId) return;
		this.placementGrid.removeBoatById(this.selectedBoatId);
		this.selectedBoatId = null;
	}

	setHoveredCell(pos: Position | null) {
		this.dragState.hoveredCell = pos;
	}

	handleCellClick(x: number, y: number) {
		const boatId = this.placementGrid.getBoatIdAt(x, y);
		if (boatId) {
			this.selectedBoatId = boatId;
		}
	}

	handleCellDragStart(x: number, y: number) {
		const boatId = this.placementGrid.getBoatIdAt(x, y);
		const boat = boatId ? this.placementGrid.getBoat(boatId) : null;
		if (boat) {
			this.startDrag(boat.length, false, boat.id, x, y);
		}
	}

	handleCellDragOver(event: DragEvent, x: number, y: number) {
		event.preventDefault();
		this.setHoveredCell({ x, y });
	}

	handleGridDragLeave() {
		this.setHoveredCell(null);
	}
}
