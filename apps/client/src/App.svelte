<script lang="ts">
	import { onMount } from 'svelte';
	import { CreateOrJoinSession, WaitForPlayerToJoin, PlaceBoats, GameBoard } from './lib/views';
	import { gameStore } from './lib/services/game-store.svelte';

	const urlParams = new URLSearchParams(window.location.search);
	const querySharedSlug = urlParams.has('s') ? urlParams.get('s') : null;

	let initializing = $state(true);

	// Use derived state from the reactive store
	const status = $derived(gameStore.session?.status ?? null);

	onMount(async () => {
		try {
			await gameStore.attemptReconnect();
		} finally {
			initializing = false;
		}
	});
</script>

{#if initializing}
	<main>
		<div class="loading">
			<p>Loading...</p>
		</div>
	</main>
{:else if status !== null}
	{#if status === 'waiting_for_friend'}
		<WaitForPlayerToJoin />
	{:else if status === 'waiting_for_boat_placements'}
		<PlaceBoats />
	{:else if status === 'in_game'}
		<GameBoard />
	{:else}
		<div class="error">
			<p>Unknown status: {status}</p>
		</div>
	{/if}
{:else}
	<CreateOrJoinSession sharedSlug={querySharedSlug} />
{/if}

<style>
	.loading,
	.error {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 2rem;
	}

	.loading p {
		color: var(--color-text-subtle);
		font-size: 1.2rem;
	}

	.error p {
		color: var(--color-text-error);
		font-size: 1.2rem;
	}
</style>
