<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { GameState } from 'game-messages';
	import { appStore } from '../app-store/store.svelte';
	import ShootingGrid from './ShootingGrid.svelte';
	import WaitingGrid from './WaitingGrid.svelte';
	import { renderPlayerGrid, renderOpponentGrid } from './presenter';
	import { createEmptyCellGrid } from '../grid/render-utils';
	import { GRID_SIZE } from 'game-rules';
	import { createEffectManager } from './effect-manager.svelte';

	const player = $derived(appStore.player);
	const opponent = $derived(appStore.opponent);
	const rawGame = $derived(appStore.game);

	const effectManager = createEffectManager();
	let displayedGame = $state<GameState | null>(null);
	let pendingGame = $state<GameState | null>(null);

	const game = $derived(displayedGame);

	const opponentTurnCells = $derived.by(() => {
		if (!game) return createEmptyCellGrid(GRID_SIZE);
		return renderPlayerGrid(game);
	});

	const yourTurnCells = $derived.by(() => {
		if (!game) return createEmptyCellGrid(GRID_SIZE);
		return renderOpponentGrid(game);
	});

	$effect(() => {
		if (!rawGame) {
			displayedGame = null;
			pendingGame = null;
			return;
		}

		if (!displayedGame) {
			displayedGame = rawGame;
			return;
		}

		if (rawGame === displayedGame) {
			return;
		}

		pendingGame = rawGame;
		handleGameStateChange(displayedGame, rawGame);
	});

	async function handleGameStateChange(oldGame: GameState, newGame: GameState) {
		const previousTurn = oldGame.turn;
		const lastShot = newGame.lastShot;
		if (!lastShot) {
			return;
		}

		if (previousTurn === 'player_turn') {
			await effectManager.playShootingSequence(
				lastShot.x,
				lastShot.y,
				lastShot.hit ? 'hit' : 'miss',
				lastShot.sunkBoat,
			);
		} else {
			await effectManager.playReceivingSequence(
				lastShot.x,
				lastShot.y,
				lastShot.hit ? 'hit' : 'miss',
				lastShot.sunkBoat,
			);
		}

		displayedGame = newGame;
		pendingGame = null;
	}

	function handleCellClick(x: number, y: number) {
		if (effectManager.isAnimating() || pendingGame) {
			return;
		}

		appStore.sendAction({
			type: 'fire_shot',
			data: { x, y },
		});
	}

	function getCellAriaLabel(x: number, y: number): string {
		return `Fire at position ${x}, ${y}`;
	}

	onDestroy(() => {
		effectManager.reset();
	});
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
				<WaitingGrid cells={opponentTurnCells} animationState={effectManager.state} />
			</div>
		</div>
	{:else}
		<div class="turn-view">
			<p class="status-message your-turn">Your turn - Click to fire!</p>

			<div class="grid-container">
				<ShootingGrid
					cells={yourTurnCells}
					onCellClick={handleCellClick}
					{getCellAriaLabel}
					animationState={effectManager.state}
				/>
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

	footer {
		margin-top: 1rem;
		text-align: center;
	}
</style>
