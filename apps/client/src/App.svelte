<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import CreateOrJoinSession from './lib/GameSession/CreateOrJoinSession.svelte';
	import type { SessionStatus } from './lib/models/session';
	import WaitForPlayerToJoin from './lib/GameSession/WaitForPlayerToJoin.svelte';
	import PlaceBoats from './lib/GameSession/PlaceBoats.svelte';
	import GameBoard from './lib/GameSession/GameBoard.svelte';
	import { gameStore } from './lib/services/game-store.svelte';

	const urlParams = new URLSearchParams(window.location.search);
	const querySharedSlug = urlParams.has('s') ? urlParams.get('s') : null;

	let initializing: boolean = $state(true);
	let status: SessionStatus | null = $state(null);

	const unsubscribe = gameStore.store.subscribe((store) => {
		if (store != null) {
			status = store.session.status;
		}
	});

	onMount(async () => {
		try {
			await gameStore.attemptReconnect();
		} finally {
			initializing = false;
		}
	});

	onDestroy(() => {
		gameStore.destroy();
		unsubscribe();
	});
</script>

{#if initializing}
	<main>
		<p>Loading...</p>
	</main>
{:else if status != null}
	{#if status === 'waiting_for_friend'}
		<WaitForPlayerToJoin />
	{:else if status === 'waiting_for_boat_placements'}
		<PlaceBoats />
	{:else if status === 'ready_to_play'}
		<GameBoard />
	{:else}
		Unknown status: {status}
	{/if}
{:else}
	<CreateOrJoinSession sharedSlug={querySharedSlug} />
{/if}
