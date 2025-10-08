<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Player } from '../models/player';
	import { gameStore } from '../services/game-store.svelte';

	let player: Player | null = $state(null);
	let sessionId: string | null = $state(null);

	const unsubscribe = gameStore.store.subscribe((store) => {
		if (store != null) {
			player = store.player;
			sessionId = store.session.id;
		}
	});

	onDestroy(() => {
		unsubscribe();
	});
</script>

<header>
	<h1>Hi {player?.username}!</h1>
</header>
<main>
	<div>Waiting for a friend...</div>
</main>
<footer>
	<p class="subtle">{sessionId}</p>
</footer>

<style>
	header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	p.subtle {
		font-size: 0.7em;
		color: var(--color-text-subtle);
		margin: 0;
	}

	footer {
		margin-top: 0.5rem;
	}
</style>
