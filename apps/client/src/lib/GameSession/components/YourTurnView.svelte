<script lang="ts">
	import type { FireShotMessage, GameState } from 'game-messages';
	import { GRID_SIZE } from 'game-rules';
	import { gameStore } from '../../services/game-store.svelte';
	import BattleGrid, { type CellState } from './BattleGrid.svelte';

	let { game }: { game: GameState } = $props();

	const cells = $derived.by(() => {
		const newCells: CellState[][] = [];
		for (let y = 0; y < GRID_SIZE; y++) {
			const row: CellState[] = [];
			for (let x = 0; x < GRID_SIZE; x++) {
				row.push({});
			}
			newCells.push(row);
		}

		game.player.shots.forEach((shot) => {
			newCells[shot.y][shot.x].shot = true;
			newCells[shot.y][shot.x].hit = shot.hit;
			newCells[shot.y][shot.x].miss = !shot.hit;
		});

		game.opponent.sunkBoats.forEach((boat) => {
			for (let i = 0; i < boat.length; i++) {
				const cellX = boat.orientation === 'horizontal' ? boat.startX + i : boat.startX;
				const cellY = boat.orientation === 'vertical' ? boat.startY + i : boat.startY;
				newCells[cellY][cellX].sunk = true;
			}
		});

		return newCells;
	});

	function handleCellClick(x: number, y: number) {
		const fireShotMessage: FireShotMessage = {
			type: 'fire_shot',
			data: { x, y },
		};
		gameStore.sendAction(fireShotMessage);
	}

	function getCellAriaLabel(x: number, y: number): string {
		return `Fire at position ${x}, ${y}`;
	}
</script>

<div class="your-turn-view">
	<p class="status-message">Your turn - Click to fire!</p>

	<div class="grid-container">
		<h4>Opponent's Grid</h4>
		<BattleGrid {cells} interactive onCellClick={handleCellClick} {getCellAriaLabel} />
	</div>
</div>

<style>
	.your-turn-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}

	.status-message {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--color-text-success);
		margin: 0;
	}

	.grid-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.grid-container h4 {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
</style>
