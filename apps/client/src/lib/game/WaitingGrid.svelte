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
		animationState: AnimationState;
	}

	let { cells, animationState }: Props = $props();

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
			<div
				class="cell"
				class:boat={cell.boat}
				class:shot={cell.shot}
				class:hit={cell.hit}
				class:miss={cell.miss}
				class:sunk={cell.sunk}
				class:animating={isAnimatingCell(x, y)}
				class:animating-hit={getAnimationClass(x, y) === 'animating-hit'}
				class:animating-miss={getAnimationClass(x, y) === 'animating-miss'}
				class:animating-sunk={getAnimationClass(x, y) === 'animating-sunk'}
			></div>
		{/each}
	{/each}
</div>

<style>
	.cell {
		transition: background 0.1s;
	}
</style>
