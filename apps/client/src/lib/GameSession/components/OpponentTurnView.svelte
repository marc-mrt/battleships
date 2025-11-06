<script lang="ts">
	import type { GameState } from 'game-messages';
	import { GRID_SIZE } from 'game-rules';
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

		game.player.boats.forEach((boat) => {
			for (let i = 0; i < boat.length; i++) {
				const cellX = boat.orientation === 'horizontal' ? boat.startX + i : boat.startX;
				const cellY = boat.orientation === 'vertical' ? boat.startY + i : boat.startY;
				newCells[cellY][cellX].boat = true;
			}
		});

		game.opponent.shotsAgainstPlayer.forEach((shot) => {
			newCells[shot.y][shot.x].shot = true;
			newCells[shot.y][shot.x].hit = shot.hit;
			newCells[shot.y][shot.x].miss = !shot.hit;
		});

		return newCells;
	});
</script>

<div class="opponent-turn-view">
	<p class="status-message">Opponent is taking their shot...</p>

	<div class="grid-container">
		<h4>Your Grid</h4>
		<BattleGrid {cells} />
	</div>
</div>

<style>
	.opponent-turn-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}

	.status-message {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--color-accent);
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
