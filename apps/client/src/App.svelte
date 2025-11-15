<script lang="ts">
	import { onMount } from 'svelte';
	import CreateOrJoinSession from './lib/new-session/CreateOrJoinSession.svelte';
	import WaitForPlayerToJoin from './lib/waiting-for-opponent/WaitForPlayerToJoin.svelte';
	import { appStore } from './lib/app-store/store.svelte';
	import PlaceBoats from './lib/placement/PlaceBoats.svelte';
	import GameBoard from './lib/game/GameBoard.svelte';
	import type { SessionStatus } from './models/session';

	function getSharedSlugFromUrl(): string | null {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.has('s') ? urlParams.get('s') : null;
	}

	const querySharedSlug = getSharedSlugFromUrl();

	let initializing = $state(true);

	const status: SessionStatus | null = $derived(appStore.session?.status ?? null);

	function finishInitializing(): void {
		initializing = false;
	}

	async function initialize(): Promise<void> {
		try {
			await appStore.attemptReconnect();
		} finally {
			finishInitializing();
		}
	}

	onMount(initialize);
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
	{:else if status === 'playing'}
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
