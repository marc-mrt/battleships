import type { BoatPlacement } from 'game-messages';
import { GRID_SIZE } from 'game-rules';
import { getBoatCells, isValidPosition, type BoatLike } from './grid-utils';

type Cell = { occupied: boolean; boatId: string | null };

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

type Shot = { x: number; y: number; hit: boolean };

export class GridManager {
	private grid = $state<Cell[][]>([]);
	private size: number;

	constructor(size: number = GRID_SIZE) {
		this.size = size;
		this.grid = this.createEmptyGrid(size);
	}

	private createEmptyGrid(size: number): Cell[][] {
		return Array(size)
			.fill(null)
			.map(() =>
				Array(size)
					.fill(null)
					.map(() => ({ occupied: false, boatId: null })),
			);
	}

	canPlaceBoat(placement: BoatPlacement, excludeBoatId?: string | null): boolean {
		const cells = getBoatCells(placement);
		return cells.every(({ x, y }) => {
			if (!isValidPosition({ x, y }, this.size)) return false;
			const cell = this.grid[y][x];
			return !cell.occupied || cell.boatId === excludeBoatId;
		});
	}

	placeBoat(placement: BoatPlacement): void {
		const cells = getBoatCells(placement);
		cells.forEach(({ x, y }) => {
			this.grid[y][x] = { occupied: true, boatId: placement.id };
		});
	}

	removeBoat(placement: BoatPlacement): void {
		const cells = getBoatCells(placement);
		cells.forEach(({ x, y }) => {
			this.grid[y][x] = { occupied: false, boatId: null };
		});
	}

	getCell(x: number, y: number): Cell | null {
		if (!isValidPosition({ x, y }, this.size)) return null;
		return this.grid[y][x];
	}

	getCells(): Cell[][] {
		return this.grid;
	}

	reset(): void {
		this.grid = this.createEmptyGrid(this.size);
	}

	toDisplayGrid(options: {
		boats?: BoatLike[];
		shots?: Shot[];
		sunkBoats?: BoatLike[];
	}): CellState[][] {
		const cells: CellState[][] = Array.from({ length: this.size }, () =>
			Array.from({ length: this.size }, () => ({})),
		);

		if (options.boats) {
			options.boats.forEach((boat) => {
				const positions = getBoatCells(boat);
				positions.forEach(({ x, y }) => {
					if (isValidPosition({ x, y }, this.size)) {
						cells[y][x].boat = true;
					}
				});
			});
		}

		if (options.shots) {
			options.shots.forEach((shot) => {
				if (isValidPosition({ x: shot.x, y: shot.y }, this.size)) {
					cells[shot.y][shot.x].shot = true;
					cells[shot.y][shot.x].hit = shot.hit;
					cells[shot.y][shot.x].miss = !shot.hit;
				}
			});
		}

		if (options.sunkBoats) {
			options.sunkBoats.forEach((boat) => {
				const positions = getBoatCells(boat);
				positions.forEach(({ x, y }) => {
					if (isValidPosition({ x, y }, this.size)) {
						cells[y][x].sunk = true;
					}
				});
			});
		}

		return cells;
	}
}
