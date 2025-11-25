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
		display: grid;
		grid-template-columns: repeat(9, 1fr);
		gap: 1px;
		background: #ddd;
		padding: 1px;
		border-radius: 2px;
		width: 100%;
		max-width: 360px;
		touch-action: none;
		user-select: none;
	}

	.cell {
		aspect-ratio: 1;
		width: 100%;
		background: var(--color-white);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.1s;
		padding: 0;
		cursor: pointer;
		touch-action: none;
	}

	.cell.draggable {
		cursor: grab;
	}

	.cell.draggable:active {
		cursor: grabbing;
	}

	.cell.boat {
		background: var(--color-accent);
	}

	.cell.selected {
		animation: pulse 1s ease-in-out infinite;
		background: var(--color-accent) !important;
		box-shadow: 0 0 4px var(--color-accent);
	}

	.cell.preview {
		opacity: 0.5;
	}

	.cell.valid-drop {
		background: var(--color-accent);
		opacity: 0.5;
	}

	.cell.invalid-drop {
		background: var(--color-text-error);
		opacity: 0.7;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
