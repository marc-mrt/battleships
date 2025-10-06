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

<form on:submit|preventDefault={mode === 'create' ? handleCreateSession : handleJoinSession}>
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

    {#if mode === 'create'}
        <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Session'}
        </button>
        <button class="alternative" on:click|preventDefault={() => mode = 'join'}>Want to join a friend instead?
        </button>
    {/if}

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

        <button type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join Session'}
        </button>
    {/if}

    {#if error}
        <p class="error">{error}</p>
    {/if}
</form>

<style>
    form {
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.2);
        color: inherit;
        font-size: 1rem;
    }

    input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    button {
        width: 100%;
        padding: 0.75rem;
        border: none;
        border-radius: 4px;
        background: #646cff;
        color: white;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 200ms;
    }

    button:hover:not(:disabled) {
        background: #535bf2;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .error {
        color: #ff3e00;
        margin: 0.5rem 0;
        font-size: 0.9rem;
    }

    button.alternative {
        background: none;
        border: none;
        color: gray;
        font-style: italic;
        transition: all 200ms ease;
    }

    button.alternative:hover:not(:disabled) {
        background: none;
        color: black;
    }
</style>
