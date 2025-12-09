<script lang="ts">
import type { CellState } from "../grid/types";

interface AnimationState {
  type: "idle" | "shooting" | "hit" | "miss" | "sunk";
  x?: number;
  y?: number;
}

interface Props {
  cells: CellState[][];
  animationState: AnimationState;
}

const { cells, animationState }: Props = $props();

function isIdle(animationState: AnimationState): boolean {
  return animationState.type === "idle";
}

function matchesPosition(
  animationState: AnimationState,
  x: number,
  y: number,
): boolean {
  return animationState.x === x && animationState.y === y;
}

function isAnimatingCell(x: number, y: number): boolean {
  return !isIdle(animationState) && matchesPosition(animationState, x, y);
}

function buildAnimationClass(type: string): string {
  return `animating-${type}`;
}

function getAnimationClass(x: number, y: number): string {
  if (!isAnimatingCell(x, y)) return "";
  return buildAnimationClass(animationState.type);
}

function shouldAnimateWithClass(
  x: number,
  y: number,
  className: string,
): boolean {
  return getAnimationClass(x, y) === className;
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
				class:animating-hit={shouldAnimateWithClass(x, y, 'animating-hit')}
				class:animating-miss={shouldAnimateWithClass(x, y, 'animating-miss')}
				class:animating-sunk={shouldAnimateWithClass(x, y, 'animating-sunk')}
			></div>
		{/each}
	{/each}
</div>

<style>
	.cell {
		transition: background var(--transition-fast);
	}
</style>
