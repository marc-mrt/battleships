import type { BoatPlacement } from 'game-messages';
import { BOATS_CONFIGURATION, TOTAL_BOATS_COUNT } from 'game-rules';
import { getBoatCells, isValidPosition, generateBoatId, toggleOrientation } from './grid-utils';
import { GridManager, type CellState } from './grid-manager.svelte';

type BoatStock = { length: number; count: number; placed: number };

type PreviewOptions = {
	hoveredX: number;
	hoveredY: number;
	boatLength: number;
	orientation: 'horizontal' | 'vertical';
	offsetX: number;
	offsetY: number;
	draggedBoatId: string | null;
};

export class PlacementGrid extends GridManager {
	private boats = $state<BoatPlacement[]>([]);
	private stock = $state<BoatStock[]>([]);

	constructor() {
		super();
		this.stock = BOATS_CONFIGURATION.map((type) => ({ ...type, placed: 0 }));
	}

	getBoats(): BoatPlacement[] {
		return this.boats;
	}

	getBoat(boatId: string): BoatPlacement | undefined {
		return this.boats.find((b) => b.id === boatId);
	}

	getStock(): BoatStock[] {
		return this.stock;
	}

	isComplete(): boolean {
		return this.boats.length === TOTAL_BOATS_COUNT;
	}

	addBoat(placement: BoatPlacement): boolean {
		const stockItem = this.stock.find((s) => s.length === placement.length);
		if (!stockItem || stockItem.placed >= stockItem.count) {
			return false;
		}

		if (!this.canPlaceBoat(placement)) {
			return false;
		}

		this.boats.push(placement);
		stockItem.placed++;
		this.placeBoat(placement);

		return true;
	}

	removeBoatById(boatId: string): boolean {
		const boat = this.boats.find((b) => b.id === boatId);
		if (!boat) return false;

		this.boats = this.boats.filter((b) => b.id !== boatId);

		const stockItem = this.stock.find((s) => s.length === boat.length);
		if (stockItem) stockItem.placed--;

		super.removeBoat(boat);

		return true;
	}

	updateBoat(boatId: string, updates: Partial<BoatPlacement>): boolean {
		const boat = this.getBoat(boatId);
		if (!boat) return false;

		super.removeBoat(boat);

		const updatedBoat = { ...boat, ...updates };

		if (!this.canPlaceBoat(updatedBoat, boatId)) {
			this.placeBoat(boat);
			return false;
		}

		const index = this.boats.findIndex((b) => b.id === boatId);
		this.boats[index] = updatedBoat;
		this.placeBoat(updatedBoat);

		return true;
	}

	rotateBoat(boatId: string): boolean {
		const boat = this.getBoat(boatId);
		if (!boat) return false;

		const newOrientation = toggleOrientation(boat.orientation);
		return this.updateBoat(boatId, { orientation: newOrientation });
	}

	placeNewBoat(
		startX: number,
		startY: number,
		length: number,
		orientation: 'horizontal' | 'vertical',
	): string | null {
		const stockItem = this.stock.find((s) => s.length === length);
		if (!stockItem || stockItem.placed >= stockItem.count) return null;

		const newBoat: BoatPlacement = {
			id: generateBoatId(),
			startX,
			startY,
			length,
			orientation,
		};

		const success = this.addBoat(newBoat);
		return success ? newBoat.id : null;
	}

	moveBoat(
		boatId: string,
		startX: number,
		startY: number,
		orientation: 'horizontal' | 'vertical',
	): boolean {
		return this.updateBoat(boatId, { startX, startY, orientation });
	}

	getBoatIdAt(x: number, y: number): string | null {
		const cell = this.getCell(x, y);
		return cell?.boatId ?? null;
	}

	toPlacementDisplayGrid(
		selectedBoatId: string | null = null,
		preview: PreviewOptions | null = null,
	): CellState[][] {
		const baseCells = this.getCells();
		const cells: CellState[][] = [];

		for (let y = 0; y < baseCells.length; y++) {
			const row: CellState[] = [];
			for (let x = 0; x < baseCells[y].length; x++) {
				const cell = baseCells[y][x];
				const isSelected = !!(selectedBoatId && cell.boatId === selectedBoatId);
				const isPreview = preview ? this.isPreviewCell(x, y, preview) : false;
				const isValidDrop = isPreview && preview ? this.isValidPreview(preview) : false;

				row.push({
					boat: cell.occupied,
					selected: isSelected,
					preview: isPreview,
					validDrop: isValidDrop,
					invalidDrop: isPreview && !isValidDrop,
				});
			}
			cells.push(row);
		}

		return cells;
	}

	private isPreviewCell(x: number, y: number, preview: PreviewOptions): boolean {
		const startX = preview.hoveredX - preview.offsetX;
		const startY = preview.hoveredY - preview.offsetY;

		const cells = getBoatCells({
			startX,
			startY,
			length: preview.boatLength,
			orientation: preview.orientation,
		});

		return cells.some((cell) => cell.x === x && cell.y === y);
	}

	private isValidPreview(preview: PreviewOptions): boolean {
		const startX = preview.hoveredX - preview.offsetX;
		const startY = preview.hoveredY - preview.offsetY;

		const placement: BoatPlacement = {
			id: preview.draggedBoatId ?? 'temp',
			startX,
			startY,
			length: preview.boatLength,
			orientation: preview.orientation,
		};

		const cells = getBoatCells(placement);
		const allCellsValid = cells.every((cell) => isValidPosition(cell));
		if (!allCellsValid) return false;

		return this.canPlaceBoat(placement, preview.draggedBoatId);
	}

	override reset(): void {
		super.reset();
		this.boats = [];
		this.stock = BOATS_CONFIGURATION.map((type) => ({ ...type, placed: 0 }));
	}
}

export type { CellState, PreviewOptions };
