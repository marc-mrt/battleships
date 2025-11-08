<script lang="ts">
	import type { CellState } from '../grid/types';

	interface Props {
		cells: CellState[][];
		onCellClick?: (x: number, y: number) => void;
		onCellDragStart?: (x: number, y: number) => void;
		onCellDragEnd?: () => void;
		onCellDragOver?: (event: DragEvent, x: number, y: number) => void;
	}

	let { cells, onCellClick, onCellDragStart, onCellDragEnd, onCellDragOver }: Props = $props();

	function handleCellClick(x: number, y: number) {
		if (onCellClick) {
			onCellClick(x, y);
		}
	}

	function handleDragStart(x: number, y: number, cellState: CellState) {
		if (cellState.boat && onCellDragStart) {
			onCellDragStart(x, y);
		}
	}

	function handleDragOver(event: DragEvent, x: number, y: number) {
		if (onCellDragOver) {
			event.preventDefault();
			onCellDragOver(event, x, y);
		}
	}
</script>

<div class="grid" role="presentation">
	{#each cells as row, y (y)}
		{#each row as cell, x (`${x}-${y}`)}
			<div
				class="cell"
				class:boat={cell.boat}
				class:selected={cell.selected}
				class:preview={cell.preview}
				class:valid-drop={cell.validDrop}
				class:invalid-drop={cell.invalidDrop}
				draggable={cell.boat}
				ondragstart={() => handleDragStart(x, y, cell)}
				ondragend={onCellDragEnd}
				ondragover={(e) => handleDragOver(e, x, y)}
				ondrop={(e) => e.preventDefault()}
				onclick={() => handleCellClick(x, y)}
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
	}

	.cell[draggable='true'] {
		cursor: grab;
	}

	.cell[draggable='true']:active {
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
