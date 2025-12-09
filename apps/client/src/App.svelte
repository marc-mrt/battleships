<script lang="ts">
import { onMount } from "svelte";
import { appStore } from "./lib/app-store/store.svelte";
import GameBoard from "./lib/game/GameBoard.svelte";
import CreateOrJoinSession from "./lib/new-session/CreateOrJoinSession.svelte";
import PlaceBoats from "./lib/placement/PlaceBoats.svelte";
import WaitForPlayerToJoin from "./lib/waiting-for-opponent/WaitForPlayerToJoin.svelte";
import type { SessionStatus } from "./models/session";

function getSharedSlugFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has("s") ? urlParams.get("s") : null;
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
	{#if status === 'waiting_for_opponent'}
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
