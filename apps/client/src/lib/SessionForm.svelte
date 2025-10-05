<script lang="ts">
	import { createSession, type Session } from './api';

	let username = '';
	let loading = false;
	let error = '';
	let session: Session | null = null;

	async function handleSubmit() {
		if (!username.trim()) {
			error = 'Username is required';
			return;
		}

		loading = true;
		error = '';

		try {
			session = await createSession(username);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create session';
		} finally {
			loading = false;
		}
	}
</script>

{#if session}
	<div class="session-info">
		<h2>Session Created!</h2>
		<p><strong>Session ID:</strong> {session.id}</p>
		<p><strong>Player:</strong> {session.owner.username}</p>
		<p><strong>Status:</strong> {session.friend ? 'In Game' : 'Waiting for opponent'}</p>
	</div>
{:else}
	<form on:submit|preventDefault={handleSubmit}>
		<h2>Create Game Session</h2>
		<div class="form-group">
			<label for="username">Username:</label>
			<input
				id="username"
				type="text"
				bind:value={username}
				placeholder="Enter your username"
				disabled={loading}
			/>
		</div>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<button type="submit" disabled={loading}>
			{loading ? 'Creating...' : 'Create Session'}
		</button>
	</form>
{/if}

<style>
	form {
		max-width: 400px;
		margin: 0 auto;
		padding: 2rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
	}

	h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
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
