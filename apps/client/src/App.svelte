<script lang="ts">
    import {onDestroy} from "svelte";
    import {playerStore} from "./lib/stores/player.svelte";
    import type {SessionStatus} from "./lib/models/session";
    import InitSession from "./lib/InitSession.svelte";

    let username: string | null = null;
    let friendUsername: string | null = null;
    let sessionId: string | null = null;
    let sessionStatus: SessionStatus | null = null;
    let webSocket: WebSocket | null = null;

    const unsubscribe = playerStore.subscribe(store => {
        if (store != null) {
            sessionId = store.session.id
            sessionStatus = store.session.status
            username = store.player.username
            webSocket = store.webSocket
            friendUsername = store.opponent?.username ?? null
        }
    })

    onDestroy(() => {
        if (webSocket) {
            webSocket.close();
        }

        unsubscribe();
    })
</script>

<main>
    <h1>Battleships</h1>
    {#if sessionId}
        <div class="session-info">
            <h2>Session Created!</h2>
            <p><strong>Session ID:</strong> {sessionId}</p>
            <p><strong>Player:</strong> {username}</p>
            {#if sessionStatus === 'waiting_for_friend'}
                <p><strong>Waiting for someone to join...</strong></p>
            {/if}
            {#if sessionStatus === 'all_players_joined'}
                {friendUsername} joined!
            {/if}
        </div>
    {:else}
        <InitSession/>
    {/if}
</main>

<style>
    h2 {
        margin-top: 0;
        margin-bottom: 1.5rem;
    }

    .session-info {
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
    }

    .session-info h2 {
        margin-top: 0;
        color: #4ade80;
    }

    .session-info p {
        margin: 0.5rem 0;
    }
</style>
