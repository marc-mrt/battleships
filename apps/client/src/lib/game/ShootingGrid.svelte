<script lang="ts">
	import type { CellState } from '../grid/types';
	import './grid-styles.css';

	interface AnimationState {
		type: 'idle' | 'shooting' | 'hit' | 'miss' | 'sunk';
		x?: number;
		y?: number;
	}

	interface Props {
		cells: CellState[][];
		onCellClick: (x: number, y: number) => void;
		getCellAriaLabel?: (x: number, y: number) => string;
		animationState: AnimationState;
	}

	let { cells, onCellClick, getCellAriaLabel, animationState }: Props = $props();

	function handleCellClick(x: number, y: number, cellState: CellState) {
		if (!cellState.shot) {
			onCellClick(x, y);
		}
	}

	function isAnimatingCell(x: number, y: number): boolean {
		return animationState.type !== 'idle' && animationState.x === x && animationState.y === y;
	}

	function getAnimationClass(x: number, y: number): string {
		if (!isAnimatingCell(x, y)) return '';
		return `animating-${animationState.type}`;
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
				class:animating={isAnimatingCell(x, y)}
				class:animating-shooting={getAnimationClass(x, y) === 'animating-shooting'}
				class:animating-hit={getAnimationClass(x, y) === 'animating-hit'}
				class:animating-miss={getAnimationClass(x, y) === 'animating-miss'}
				class:animating-sunk={getAnimationClass(x, y) === 'animating-sunk'}
				disabled={cell.shot}
				onclick={() => handleCellClick(x, y, cell)}
				type="button"
				aria-label={getCellAriaLabel ? getCellAriaLabel(x, y) : `Cell ${x}, ${y}`}
			></button>
		{/each}
	{/each}
</div>

<style>
	.cell {
		border-radius: 0;
		transition: all 0.1s;
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
</style>
