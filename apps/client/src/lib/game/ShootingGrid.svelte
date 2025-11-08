<script lang="ts">
	import type { CellState } from '../grid/types';

	interface Props {
		cells: CellState[][];
		onCellClick: (x: number, y: number) => void;
		getCellAriaLabel?: (x: number, y: number) => string;
	}

	let { cells, onCellClick, getCellAriaLabel }: Props = $props();

	function handleCellClick(x: number, y: number, cellState: CellState) {
		if (!cellState.shot) {
			onCellClick(x, y);
		}
	}
</script>

<div class="grid" role="presentation">
	{#each cells as row, y (y)}
		{#each row as cell, x (`${x}-${y}`)}
			<button
				class="cell"
				class:shot={cell.shot}
				class:hit={cell.hit}
				class:miss={cell.miss}
				class:sunk={cell.sunk}
				disabled={cell.shot}
				onclick={() => handleCellClick(x, y, cell)}
				type="button"
				aria-label={getCellAriaLabel ? getCellAriaLabel(x, y) : `Cell ${x}, ${y}`}
			></button>
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
		border-radius: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.1s;
		padding: 0;
		cursor: pointer;
	}

	.cell:not(:disabled):hover {
		position: relative;
		background: var(--color-white);

		animation: borderGrow 0.2s ease-out forwards;
	}

	.cell:not(:disabled):hover::before {
		content: '';
		position: absolute;
		inset: 0;
		border: 2px solid red;
		border-radius: 0px;
		animation: borderGrow 0.2s ease-out forwards;
	}

	.cell:not(:disabled):hover::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		height: 100%;
		background: linear-gradient(
				to bottom,
				red 0%,
				red 48%,
				transparent 48%,
				transparent 52%,
				red 52%,
				red 100%
			),
			linear-gradient(
				to right,
				red 0%,
				red 48%,
				transparent 48%,
				transparent 52%,
				red 52%,
				red 100%
			),
			red;
		clip-path: polygon(
			48% 0,
			52% 0,
			52% 48%,
			100% 48%,
			100% 52%,
			52% 52%,
			52% 100%,
			48% 100%,
			48% 52%,
			0 52%,
			0 48%,
			48% 48%
		);
		animation: crosshairExpand 0.4s ease-out forwards;
	}

	@keyframes borderGrow {
		from {
			border-radius: 0px;
		}
		to {
			border-radius: 24px;
		}
	}

	@keyframes crosshairExpand {
		from {
			clip-path: polygon(
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%,
				50% 50%
			);
		}
		to {
			clip-path: polygon(
				48% 0,
				52% 0,
				52% 48%,
				100% 48%,
				100% 52%,
				52% 52%,
				52% 100%,
				48% 100%,
				48% 52%,
				0 52%,
				0 48%,
				48% 48%
			);
		}
	}

	.cell:disabled {
		cursor: default;
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
</style>
