<script lang="ts">
	import type { CellState } from '../domain/grid-manager.svelte';

	interface Props {
		cells: CellState[][];
		interactive?: boolean;
		draggable?: boolean;
		onCellClick?: (x: number, y: number) => void;
		onCellDragStart?: (x: number, y: number) => void;
		onCellDragEnd?: () => void;
		onCellDragOver?: (event: DragEvent, x: number, y: number) => void;
		onGridDragLeave?: () => void;
		getCellAriaLabel?: (x: number, y: number) => string;
	}

	let {
		cells,
		interactive = false,
		draggable = false,
		onCellClick,
		onCellDragStart,
		onCellDragEnd,
		onCellDragOver,
		onGridDragLeave,
		getCellAriaLabel,
	}: Props = $props();

	function handleCellClick(x: number, y: number, cellState: CellState) {
		if (interactive && onCellClick && !cellState.shot) {
			onCellClick(x, y);
		}
	}

	function handleDragStart(x: number, y: number, cellState: CellState) {
		if (draggable && cellState.boat && onCellDragStart) {
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

<div class="grid" ondragleave={onGridDragLeave} role="presentation">
	{#each cells as row, y (y)}
		{#each row as cell, x (`${x}-${y}`)}
			{#if interactive}
				<button
					class="cell"
					class:boat={cell.boat}
					class:shot={cell.shot}
					class:hit={cell.hit}
					class:miss={cell.miss}
					class:sunk={cell.sunk}
					class:selected={cell.selected}
					class:preview={cell.preview}
					class:valid-drop={cell.validDrop}
					class:invalid-drop={cell.invalidDrop}
					disabled={cell.shot}
					onclick={() => handleCellClick(x, y, cell)}
					type="button"
					aria-label={getCellAriaLabel ? getCellAriaLabel(x, y) : `Cell ${x}, ${y}`}
				></button>
			{:else}
				<div
					class="cell"
					class:boat={cell.boat}
					class:shot={cell.shot}
					class:hit={cell.hit}
					class:miss={cell.miss}
					class:sunk={cell.sunk}
					class:selected={cell.selected}
					class:preview={cell.preview}
					class:valid-drop={cell.validDrop}
					class:invalid-drop={cell.invalidDrop}
					draggable={draggable && cell.boat}
					ondragstart={() => handleDragStart(x, y, cell)}
					ondragend={onCellDragEnd}
					ondragover={(e) => handleDragOver(e, x, y)}
					onkeydown={undefined}
					role="presentation"
				></div>
			{/if}
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
	}

	button.cell {
		cursor: pointer;
	}

	button.cell:not(:disabled):hover {
		background: var(--color-accent);
		opacity: 0.3;
	}

	button.cell:disabled {
		cursor: default;
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

	.cell.sunk {
		background: #666;
	}

	.cell.hit {
		background: var(--color-text-error);
		position: relative;
	}

	.cell.hit::after {
		content: '×';
		font-size: 1.5rem;
		font-weight: bold;
		color: white;
		line-height: 1;
	}

	.cell.miss {
		background: var(--color-white);
		position: relative;
	}

	.cell.miss::after {
		content: '•';
		font-size: 1.5rem;
		color: var(--color-text-subtle);
		line-height: 1;
	}

	.cell.sunk::before {
		content: '☠';
		font-size: 1.2rem;
		color: white;
		line-height: 1;
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
