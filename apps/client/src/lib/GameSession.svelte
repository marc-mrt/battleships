<script lang="ts">
    import {onDestroy} from "svelte";
    import {playerStore} from "./stores/player.svelte";
    import type {SessionStatus} from "./models/session";
    import type {Player} from "./models/player";

    let player: Player;
    let sessionId: string;
    let opponent: Player | null = null;
    let status: SessionStatus | null = null;

    const unsubscribe = playerStore.subscribe(store => {
        if (store != null) {
            sessionId = store.session.id;
            player = store.player;
            opponent = store.opponent;
            status = store.session.status;
        }
    })

    onDestroy(() => {
        unsubscribe();
    })
</script>

<header>
    <h3 class="player">{player.username}</h3>
    <h3>{opponent?.username}</h3>
</header>
<main>
    {#if status === 'waiting_for_friend'}
        <div>Waiting for a friend...</div>
    {:else if status === 'all_players_joined'}
        <div>All players joined!</div>
    {/if}
</main>
<footer>
    <p class="subtle">{sessionId}</p>
</footer>

<style>
    header {
        display: flex;
        justify-content: space-between;
    }

    p.subtle {
        font-size: 0.8em;
        color: var(--color-text-subtle);
    }

    .player {
        text-decoration: underline;
        text-decoration-color: var(--color-text-success);
    }
</style>
