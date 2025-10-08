<script lang="ts">
	import type { BoatPlacement } from 'game-messages';
	import type { Cell } from '../utils/boat-utils';

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
</script>

<div class="grid" ondragleave={onGridDragLeave} role="presentation">
	{#each grid as row, y (y)}
		{#each row as cell, x (`${x}-${y}`)}
			{@const isSelected = selectedBoatId && cell.boatId === selectedBoatId}
			{@const isPreview = isPreviewCell(x, y)}
			{@const boat = cell.boatId ? boats.find((b) => b.id === cell.boatId) : null}
			<div
				class="cell"
				class:occupied={cell.occupied}
				class:selected={isSelected}
				class:preview={isPreview}
				class:valid-drop={isPreview && isValidPlacement()}
				class:invalid-drop={isPreview && !isValidPlacement()}
				draggable={cell.occupied}
				ondragstart={() => boat && onCellDragStart(boat, x, y)}
				ondragend={onCellDragEnd}
				ondragover={(e) => onCellDragOver(e, x, y)}
				onclick={() => onCellClick(cell)}
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
		transition: all 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: default;
	}

	.cell.occupied {
		background: var(--color-accent);
		cursor: grab;
	}

	.cell.occupied:active {
		cursor: grabbing;
	}

	.cell.valid-drop {
		background: var(--color-accent);
		opacity: 0.5;
	}

	.cell.invalid-drop {
		background: var(--color-text-error);
		opacity: 0.7;
	}

	.cell.selected {
		animation: pulse 1s ease-in-out infinite;
		background: var(--color-accent) !important;
		box-shadow: 0 0 4px var(--color-accent);
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
