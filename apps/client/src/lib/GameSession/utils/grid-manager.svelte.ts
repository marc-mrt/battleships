import type { BoatPlacement } from 'game-messages';
import {
	canPlaceBoat as canPlaceBoatUtil,
	type Cell,
	generateBoatId,
	getBoatCells,
	type Orientation,
	type Position,
	toggleOrientation,
} from './boat-utils';
import { BOATS_CONFIGURATION, GRID_SIZE } from 'game-rules';

export type BoatStock = { length: number; count: number; placed: number };

export class GridManager {
	grid = $state<Cell[][]>(this.createEmptyGrid());
	boats = $state<BoatPlacement[]>([]);
	boatStock = $state<BoatStock[]>(BOATS_CONFIGURATION.map((type) => ({ ...type, placed: 0 })));
	selectedBoatId = $state<string | null>(null);

	// Drag state
	dragState = $state({
		boatLength: null as number | null,
		orientation: 'horizontal' as Orientation,
		hoveredCell: null as Position | null,
		isDragging: false,
		boatId: null as string | null,
		offset: { x: 0, y: 0 },
	});

	private createEmptyGrid(): Cell[][] {
		return Array(GRID_SIZE)
			.fill(null)
			.map(() =>
				Array(GRID_SIZE)
					.fill(null)
					.map(() => ({ occupied: false, boatId: null })),
			);
	}

	private updateGridCells(cells: Position[], occupied: boolean, boatId: string | null = null) {
		cells.forEach(({ x, y }) => {
			if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
				this.grid[y][x] = { occupied, boatId };
			}
		});
	}

	addBoatToGrid(boat: BoatPlacement) {
		const cells = getBoatCells(boat);
		this.updateGridCells(cells, true, boat.id);
	}

	removeBoatFromGrid(boatId: string) {
		const boat = this.boats.find((b) => b.id === boatId);
		if (!boat) return;

		const cells = getBoatCells(boat);
		this.updateGridCells(cells, false);
	}

	canPlaceBoat(
		x: number,
		y: number,
		length: number,
		orientation: Orientation,
		excludeBoatId?: string | null,
	): boolean {
		return canPlaceBoatUtil(this.grid, x, y, length, orientation, excludeBoatId);
	}

	// Drag operations
	startDrag(length: number, fromStock = true, boatId?: string, cellX?: number, cellY?: number) {
		if (fromStock) {
			const stockItem = this.boatStock.find((b) => b.length === length);
			if (!stockItem || stockItem.placed >= stockItem.count) return;

			this.dragState.offset = { x: 0, y: 0 };
			this.dragState.orientation = 'horizontal';
		} else if (boatId) {
			const boat = this.boats.find((b) => b.id === boatId);
			if (boat && cellX !== undefined && cellY !== undefined) {
				this.dragState.offset = { x: cellX - boat.startX, y: cellY - boat.startY };
				this.dragState.orientation = boat.orientation;
			}
			this.removeBoatFromGrid(boatId);
		}

		this.dragState.boatLength = length;
		this.dragState.isDragging = true;
		this.dragState.boatId = boatId || null;

		if (boatId) this.selectedBoatId = boatId;
	}

	endDrag() {
		if (this.dragState.hoveredCell && this.dragState.boatLength && this.isValidPlacement()) {
			this.placeBoat(this.dragState.hoveredCell.x, this.dragState.hoveredCell.y);
		} else if (this.dragState.boatId) {
			// Restore boat if drag was canceled
			const boat = this.boats.find((b) => b.id === this.dragState.boatId);
			if (boat) this.addBoatToGrid(boat);
		}

		// Reset drag state
		this.dragState = {
			boatLength: null,
			orientation: 'horizontal',
			hoveredCell: null,
			isDragging: false,
			boatId: null,
			offset: { x: 0, y: 0 },
		};
	}

	placeBoat(x: number, y: number) {
		if (!this.dragState.boatLength) return;

		const startX = x - this.dragState.offset.x;
		const startY = y - this.dragState.offset.y;

		if (
			!this.canPlaceBoat(
				startX,
				startY,
				this.dragState.boatLength,
				this.dragState.orientation,
				this.dragState.boatId,
			)
		) {
			return;
		}

		if (this.dragState.boatId) {
			// Moving an existing boat
			const boat = this.boats.find((b) => b.id === this.dragState.boatId);
			if (boat) {
				boat.startX = startX;
				boat.startY = startY;
				boat.orientation = this.dragState.orientation;
				this.addBoatToGrid(boat);
			}
		} else {
			// Placing a new boat from stock
			const stockItem = this.boatStock.find((b) => b.length === this.dragState.boatLength);
			if (!stockItem || stockItem.placed >= stockItem.count) return;

			const newBoat: BoatPlacement = {
				id: generateBoatId(),
				startX,
				startY,
				length: this.dragState.boatLength,
				orientation: this.dragState.orientation,
			};

			this.addBoatToGrid(newBoat);
			this.boats.push(newBoat);
			stockItem.placed++;
			this.selectedBoatId = newBoat.id;
		}
	}

	removeBoat(boatId: string) {
		const boat = this.boats.find((b) => b.id === boatId);
		if (!boat) return;

		this.removeBoatFromGrid(boatId);
		this.boats = this.boats.filter((b) => b.id !== boatId);

		const stockItem = this.boatStock.find((b) => b.length === boat.length);
		if (stockItem) stockItem.placed--;
	}

	rotateSelectedBoat() {
		if (!this.selectedBoatId) return;

		const boat = this.boats.find((b) => b.id === this.selectedBoatId);
		if (!boat) return;

		const newOrientation = toggleOrientation(boat.orientation);

		if (
			this.canPlaceBoat(boat.startX, boat.startY, boat.length, newOrientation, this.selectedBoatId)
		) {
			this.removeBoatFromGrid(this.selectedBoatId);
			boat.orientation = newOrientation;
			this.addBoatToGrid(boat);
		}
	}

	deleteSelectedBoat() {
		if (!this.selectedBoatId) return;
		this.removeBoat(this.selectedBoatId);
		this.selectedBoatId = null;
	}

	// Computed helpers
	isPreviewCell(x: number, y: number): boolean {
		if (!this.dragState.isDragging || !this.dragState.boatLength || !this.dragState.hoveredCell)
			return false;

		const startX = this.dragState.hoveredCell.x - this.dragState.offset.x;
		const startY = this.dragState.hoveredCell.y - this.dragState.offset.y;

		if (this.dragState.orientation === 'horizontal') {
			return y === startY && x >= startX && x < startX + this.dragState.boatLength;
		}
		return x === startX && y >= startY && y < startY + this.dragState.boatLength;
	}

	isValidPlacement(): boolean {
		if (!this.dragState.hoveredCell || !this.dragState.boatLength) return false;
		const startX = this.dragState.hoveredCell.x - this.dragState.offset.x;
		const startY = this.dragState.hoveredCell.y - this.dragState.offset.y;
		return this.canPlaceBoat(
			startX,
			startY,
			this.dragState.boatLength,
			this.dragState.orientation,
			this.dragState.boatId,
		);
	}

	setHoveredCell(pos: Position | null) {
		this.dragState.hoveredCell = pos;
	}
}
