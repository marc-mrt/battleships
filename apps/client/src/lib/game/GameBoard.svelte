<script lang="ts">
	import { appStore } from '../app-store/store.svelte';
	import ShootingGrid from './ShootingGrid.svelte';
	import WaitingGrid from './WaitingGrid.svelte';
	import { renderPlayerGrid, renderOpponentGrid } from './presenter';
	import { createEmptyCellGrid } from '../grid/render-utils';
	import { GRID_SIZE } from 'game-rules';

	const player = $derived(appStore.player);
	const opponent = $derived(appStore.opponent);
	const game = $derived(appStore.game);

	const opponentTurnCells = $derived.by(() => {
		if (!game) return createEmptyCellGrid(GRID_SIZE);
		return renderPlayerGrid(game);
	});

	const yourTurnCells = $derived.by(() => {
		if (!game) return createEmptyCellGrid(GRID_SIZE);
		return renderOpponentGrid(game);
	});

	function handleCellClick(x: number, y: number) {
		appStore.sendAction({
			type: 'fire_shot',
			data: { x, y },
		});
	}

	function getCellAriaLabel(x: number, y: number): string {
		return `Fire at position ${x}, ${y}`;
	}
</script>

<header>
	<h3 class="player">{player?.username}</h3>
	<h3>{opponent?.username}</h3>
</header>

<main>
	{#if !game}
		<div class="loading">
			<p>Loading game...</p>
		</div>
	{:else if game.turn === 'opponent_turn'}
		<div class="turn-view">
			<p class="status-message opponent-turn">Opponent is taking their shot...</p>

			<div class="grid-container">
				<h4>Your Grid</h4>
				<WaitingGrid cells={opponentTurnCells} />
			</div>
		</div>
	{:else}
		<div class="turn-view">
			<p class="status-message your-turn">Your turn - Click to fire!</p>

			<div class="grid-container">
				<h4>Opponent's Grid</h4>
				<ShootingGrid cells={yourTurnCells} onCellClick={handleCellClick} {getCellAriaLabel} />
			</div>
		</div>
	{/if}
</main>

<footer></footer>

<style>
	header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.player {
		text-decoration: underline;
		text-decoration-color: var(--color-text-success);
	}

	.turn-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		color: var(--color-text-subtle);
	}

	.status-message {
		font-size: 1.1rem;
		font-weight: 500;
		margin: 0;
	}

	.status-message.your-turn {
		color: var(--color-text-success);
	}

	.status-message.opponent-turn {
		color: var(--color-accent);
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

	footer {
		margin-top: 1rem;
		text-align: center;
	}
</style>
