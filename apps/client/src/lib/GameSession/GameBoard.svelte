<script lang="ts">
	import type { Player } from '../models/player';
	import { onDestroy } from 'svelte';
	import { gameStore } from '../services/game-store.svelte';
	import type { GameState } from 'game-messages';
	import OpponentTurnView from './components/OpponentTurnView.svelte';
	import YourTurnView from './components/YourTurnView.svelte';

	let player: Player | null = $state(null);
	let opponent: Player | null = $state(null);
	let game: GameState | null = $state(null);

	const unsubscribe = gameStore.store.subscribe((store) => {
		if (store != null) {
			player = store.player;
			opponent = store.opponent;
			game = store.game;
		}
	});

	onDestroy(unsubscribe);
</script>

<header>
	<h3 class="player">{player?.username}</h3>
	<h3>{opponent?.username}</h3>
</header>

<main>
	{#if game}
		{#if game.turn === 'opponent_turn'}
			<OpponentTurnView {game} />
		{:else}
			<YourTurnView {game} />
		{/if}
	{:else}
		<p>Loading game...</p>
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

	footer {
		margin-top: 1rem;
		text-align: center;
	}
</style>
