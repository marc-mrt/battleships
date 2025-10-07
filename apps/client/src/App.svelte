<script lang="ts">
    import {onDestroy} from "svelte";
    import {playerStore} from "./lib/stores/player.svelte";
    import InitSession from "./lib/InitSession.svelte";
    import GameSession from "./lib/GameSession.svelte";

    let sessionId: string | null = null;
    let webSocket: WebSocket | null = null;

    const unsubscribe = playerStore.subscribe(store => {
        if (store != null) {
            sessionId = store.session.id
            webSocket = store.webSocket
        }
    })

    onDestroy(() => {
        if (webSocket) {
            webSocket.close();
        }

        unsubscribe();
    })
</script>


{#if sessionId}
    <GameSession/>
{:else}
    <InitSession/>
{/if}
