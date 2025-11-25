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

	function isCellShot(cellState: CellState): boolean {
		return cellState.shot ?? false;
	}

	function handleCellClick(x: number, y: number, cellState: CellState) {
		if (!isCellShot(cellState)) {
			onCellClick(x, y);
		}
	}

	function isIdle(animationState: AnimationState): boolean {
		return animationState.type === 'idle';
	}

	function matchesPosition(animationState: AnimationState, x: number, y: number): boolean {
		return animationState.x === x && animationState.y === y;
	}

	function isAnimatingCell(x: number, y: number): boolean {
		return !isIdle(animationState) && matchesPosition(animationState, x, y);
	}

	function buildAnimationClass(type: string): string {
		return `animating-${type}`;
	}

	function getAnimationClass(x: number, y: number): string {
		if (!isAnimatingCell(x, y)) return '';
		return buildAnimationClass(animationState.type);
	}

	function shouldAnimateWithClass(x: number, y: number, className: string): boolean {
		return getAnimationClass(x, y) === className;
	}

	function getDefaultAriaLabel(x: number, y: number): string {
		return `Cell ${x}, ${y}`;
	}

	function getCellLabel(x: number, y: number): string {
		return getCellAriaLabel ? getCellAriaLabel(x, y) : getDefaultAriaLabel(x, y);
	}

	function createClickHandler(x: number, y: number, cell: CellState) {
		return function handleClick() {
			handleCellClick(x, y, cell);
		};
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
				class:animating-shooting={shouldAnimateWithClass(x, y, 'animating-shooting')}
				class:animating-hit={shouldAnimateWithClass(x, y, 'animating-hit')}
				class:animating-miss={shouldAnimateWithClass(x, y, 'animating-miss')}
				class:animating-sunk={shouldAnimateWithClass(x, y, 'animating-sunk')}
				disabled={isCellShot(cell)}
				onclick={createClickHandler(x, y, cell)}
				type="button"
				aria-label={getCellLabel(x, y)}
			></button>
		{/each}
	{/each}
</div>

<style>
	.cell {
		border-radius: 0;
		transition: all 0.1s;
		cursor: pointer;
		touch-action: manipulation;
	}

	@media (min-width: 640px) {
		.cell {
			min-height: auto;
		}
	}

	@media (hover: hover) and (pointer: fine) {
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
	}

	.cell:not(:disabled):active {
		transform: scale(0.95);
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
