<script lang="ts">
	import type { CellState } from '../grid/types';

	interface Props {
		cells: CellState[][];
		onCellClick: (x: number, y: number) => void;
		onCellPointerStart: (x: number, y: number) => void;
		onCellPointerMove: (x: number, y: number) => void;
	}

	let { cells, onCellClick, onCellPointerStart, onCellPointerMove }: Props = $props();

	let gridElement: HTMLDivElement | null = $state(null);

	function isCellBoat(cellState: CellState): boolean {
		return cellState.boat ?? false;
	}

	function getCellFromPoint(clientX: number, clientY: number): { x: number; y: number } | null {
		if (!gridElement) return null;

		const rect = gridElement.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
			return null;
		}

		const cellWidth = rect.width / 9;
		const cellHeight = rect.height / 9;

		const cellX = Math.floor(x / cellWidth);
		const cellY = Math.floor(y / cellHeight);

		if (cellX < 0 || cellX >= 9 || cellY < 0 || cellY >= 9) {
			return null;
		}

		return { x: cellX, y: cellY };
	}

	function handleGlobalPointerMove(e: PointerEvent): void {
		const cell = getCellFromPoint(e.clientX, e.clientY);
		if (cell) {
			onCellPointerMove(cell.x, cell.y);
		}
	}

	function createPointerDownHandler(x: number, y: number, cell: CellState) {
		return function onPointerDown(e: PointerEvent) {
			if (isCellBoat(cell)) {
				e.preventDefault();
				onCellPointerStart(x, y);
			}
		};
	}

	function createClickHandler(x: number, y: number) {
		return function onClick() {
			onCellClick(x, y);
		};
	}
</script>

<svelte:window onpointermove={handleGlobalPointerMove} />

<div class="grid" role="presentation" bind:this={gridElement}>
	{#each cells as row, y (y)}
		{#each row as cell, x (`${x}-${y}`)}
			<div
				class="cell"
				class:boat={cell.boat}
				class:selected={cell.selected}
				class:preview={cell.preview}
				class:valid-drop={cell.validDrop}
				class:invalid-drop={cell.invalidDrop}
				class:draggable={isCellBoat(cell)}
				onpointerdown={createPointerDownHandler(x, y, cell)}
				onclick={createClickHandler(x, y)}
				onkeydown={undefined}
				role="presentation"
			></div>
		{/each}
	{/each}
</div>

<style>
	.grid {
		touch-action: none;
		user-select: none;
	}

	.cell {
		transition: background var(--transition-fast);
		cursor: pointer;
		touch-action: none;
	}

	.cell.draggable {
		cursor: grab;
	}

	.cell.draggable:active {
		cursor: grabbing;
	}

	.cell.selected {
		animation: pulse var(--animation-pulse) ease-in-out infinite;
		background: var(--color-boat) !important;
		box-shadow: 0 0 4px var(--color-boat);
	}

	.cell.preview {
		opacity: 0.5;
	}

	.cell.valid-drop {
		background: var(--color-boat);
		opacity: 0.5;
	}

	.cell.invalid-drop {
		background: var(--color-text-error);
		opacity: 0.7;
	}
</style>
