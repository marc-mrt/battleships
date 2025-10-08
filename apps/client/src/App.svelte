<script lang="ts">
	import { onDestroy } from 'svelte';
	import CreateOrJoinSession from './lib/GameSession/CreateOrJoinSession.svelte';
	import type { SessionStatus } from './lib/models/session';
	import WaitForPlayerToJoin from './lib/GameSession/WaitForPlayerToJoin.svelte';
	import PlaceBoats from './lib/GameSession/PlaceBoats.svelte';
	import GameBoard from './lib/GameSession/GameBoard.svelte';
	import { gameStore } from './lib/services/game-store.svelte';

	let sessionId: string | null = null;
	let status: SessionStatus | null = null;

	const unsubscribe = gameStore.store.subscribe((store) => {
		if (store != null) {
			sessionId = store.session.id;
			status = store.session.status;
		}
	});

	onDestroy(() => {
		gameStore.destroy();
		unsubscribe();
	});
</script>

{#if sessionId}
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
	<CreateOrJoinSession />
{/if}
