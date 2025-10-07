<script lang="ts">
    import {createSession, joinSession} from "./stores/player.svelte";

    let mode: 'create' | 'join' = 'create';
    let username = '';
    let sessionId = '';
    let loading = false;
    let error = '';

    async function handleCreateSession() {
        if (!username.trim()) {
            error = 'Username is required';
            return;
        }

        loading = true;
        error = '';

        try {
            await createSession({username});
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create session';
        } finally {
            loading = false;
        }
    }

    async function handleJoinSession() {
        if (!username.trim()) {
            error = 'Username is required';
            return;
        }

        if (!sessionId.trim()) {
            error = 'Session ID is required';
            return;
        }

        loading = true;
        error = '';

        try {
            await joinSession({username, sessionId});
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to join session';
        } finally {
            loading = false;
        }
    }
</script>

<header>
    <h1>Battleships</h1>
</header>
<main>
    <form id="init-session" on:submit|preventDefault={mode === 'create' ? handleCreateSession : handleJoinSession}>
        <div class="form-group">
            <label for="username">How do you want to be called?</label>
            <input
                    id="username"
                    type="text"
                    bind:value={username}
                    placeholder="John Doe"
                    disabled={loading}
            />
        </div>

        {#if mode === 'join'}
            <div class="form-group">
                <label for="sessionId">Type in the session id your friend shared:</label>
                <input
                        id="sessionId"
                        type="text"
                        bind:value={sessionId}
                        placeholder="7feba3dd-4da6-4bed-8374-301ae6d3abae"
                        disabled={loading}
                />
            </div>
        {/if}

        {#if error}
            <p class="error">{error}</p>
        {/if}
    </form>
</main>
<footer>
    {#if mode === 'create'}
        <button type="submit" form="init-session" disabled={loading}>
            {loading ? 'Creating...' : 'Create Session'}
        </button>
        <button class="alternative" on:click|preventDefault={() => mode = 'join'}>Want to join a friend instead?
        </button>
    {/if}

    {#if mode === 'join'}
        <button type="submit" form="init-session" disabled={loading}>
            {loading ? 'Joining...' : 'Join Session'}
        </button>
    {/if}

</footer>

<style>
    form {
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
        border-radius: 8px;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    button {
        width: 100%;
    }

    .error {
        color: var(--color-text-error);
        margin: 0.5rem 0;
        font-size: 0.9rem;
    }

    button.alternative {
        background: none;
        border: none;
        color: var(--color-text-subtle);
        font-style: italic;
        transition: all 200ms ease;
    }

    button.alternative:hover:not(:disabled) {
        text-decoration: underline;
    }
</style>
