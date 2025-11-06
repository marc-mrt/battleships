<script lang="ts">
	import type { BoatPlacement } from 'game-messages';
	import type { Cell } from '../utils/boat-utils';
	import BattleGrid, { type CellState } from './BattleGrid.svelte';
	import { GRID_SIZE } from 'game-rules';

	interface Props {
		grid: Cell[][];
		boats: BoatPlacement[];
		selectedBoatId: string | null;
		isPreviewCell: (x: number, y: number) => boolean;
		isValidPlacement: () => boolean;
		onCellClick: (cell: Cell) => void;
		onCellDragStart: (boat: BoatPlacement, x: number, y: number) => void;
		onCellDragEnd: () => void;
		onCellDragOver: (event: DragEvent, x: number, y: number) => void;
		onGridDragLeave: () => void;
	}

	let {
		grid,
		boats,
		selectedBoatId,
		isPreviewCell,
		isValidPlacement,
		onCellClick,
		onCellDragStart,
		onCellDragEnd,
		onCellDragOver,
		onGridDragLeave,
	}: Props = $props();

	// Convert Cell[][] to CellState[][]
	const cells = $derived.by(() => {
		const newCells: CellState[][] = [];
		for (let y = 0; y < GRID_SIZE; y++) {
			const row: CellState[] = [];
			for (let x = 0; x < GRID_SIZE; x++) {
				const cell = grid[y][x];
				const isSelected = !!(selectedBoatId && cell.boatId === selectedBoatId);
				const isPreview = isPreviewCell(x, y);

				row.push({
					boat: cell.occupied,
					selected: isSelected,
					preview: isPreview,
					validDrop: isPreview && isValidPlacement(),
					invalidDrop: isPreview && !isValidPlacement(),
				});
			}
			newCells.push(row);
		}
		return newCells;
	});

	function handleCellClick(x: number, y: number) {
		const cell = grid[y][x];
		onCellClick(cell);
	}

	function handleCellDragStart(x: number, y: number) {
		const cell = grid[y][x];
		const boat = cell.boatId ? boats.find((b) => b.id === cell.boatId) : null;
		if (boat) {
			onCellDragStart(boat, x, y);
		}
	}
</script>

<BattleGrid
	{cells}
	draggable
	onCellClick={handleCellClick}
	onCellDragStart={handleCellDragStart}
	{onCellDragEnd}
	{onCellDragOver}
	{onGridDragLeave}
/>
