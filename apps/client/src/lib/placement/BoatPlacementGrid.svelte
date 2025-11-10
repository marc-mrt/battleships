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

	function hasClickHandler(): boolean {
		return onCellClick !== undefined;
	}

	function hasDragStartHandler(): boolean {
		return onCellDragStart !== undefined;
	}

	function hasDragOverHandler(): boolean {
		return onCellDragOver !== undefined;
	}

	function isCellBoat(cellState: CellState): boolean {
		return cellState.boat ?? false;
	}

	function canDragCell(cellState: CellState): boolean {
		return isCellBoat(cellState) && hasDragStartHandler();
	}

	function handleCellClick(x: number, y: number) {
		if (hasClickHandler() && onCellClick) {
			onCellClick(x, y);
		}
	}

	function handleDragStart(x: number, y: number, cellState: CellState) {
		if (canDragCell(cellState) && onCellDragStart) {
			onCellDragStart(x, y);
		}
	}

	function preventDefaultEvent(event: DragEvent) {
		event.preventDefault();
	}

	function handleDragOver(event: DragEvent, x: number, y: number) {
		if (hasDragOverHandler() && onCellDragOver) {
			preventDefaultEvent(event);
			onCellDragOver(event, x, y);
		}
	}

	function handleDrop(event: DragEvent) {
		preventDefaultEvent(event);
	}

	function createDragStartHandler(x: number, y: number, cell: CellState) {
		return function handleStart() {
			handleDragStart(x, y, cell);
		};
	}

	function createDragOverHandler(x: number, y: number) {
		return function handleOver(e: DragEvent) {
			handleDragOver(e, x, y);
		};
	}

	function createClickHandler(x: number, y: number) {
		return function handleClick() {
			handleCellClick(x, y);
		};
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
				ondragstart={createDragStartHandler(x, y, cell)}
				ondragend={onCellDragEnd}
				ondragover={createDragOverHandler(x, y)}
				ondrop={handleDrop}
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
