<script lang="ts">
	import { appStore } from '../app-store/store.svelte';
	import { validateUsername, validateSlug } from './session-validators';

	interface Props {
		sharedSlug?: string | null;
	}

	let { sharedSlug = null }: Props = $props();

	let mode = $state<'create' | 'join'>(sharedSlug ? 'join' : 'create');
	let username = $state('');
	let slug = $state(sharedSlug ?? '');
	let loading = $state(false);
	let error = $state('');

	const usernameError = $derived.by(() => {
		if (loading || !username) return null;
		const result = validateUsername(username);
		return result.valid ? null : result.error;
	});

	const slugError = $derived.by(() => {
		if (mode !== 'join' || loading || !slug) return null;
		const result = validateSlug(slug);
		return result.valid ? null : result.error;
	});

	const canSubmit = $derived(
		!usernameError && !slugError && !loading && username.trim().length > 0,
	);

	async function handleCreateSession() {
		if (!canSubmit) return;

		loading = true;
		error = '';

		try {
			await appStore.createSession({ username: username.trim() });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create session';
		} finally {
			loading = false;
		}
	}

	async function handleJoinSession() {
		if (!canSubmit || mode !== 'join') return;

		loading = true;
		error = '';

		try {
			await appStore.joinSession({ username: username.trim(), slug: slug.trim() });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to join session';
		} finally {
			loading = false;
		}
	}

	function handleSubmit() {
		if (mode === 'create') {
			handleCreateSession();
		} else {
			handleJoinSession();
		}
	}
</script>

<header>
	<h1>Battleships</h1>
</header>
<main>
	<form
		id="init-session"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		aria-label="Create or join game session"
	>
		<div class="form-group">
			<label for="username">How do you want to be called?</label>
			<input
				id="username"
				type="text"
				bind:value={username}
				placeholder="John Doe"
				disabled={loading}
				aria-invalid={!!usernameError}
				aria-describedby={usernameError ? 'username-error' : undefined}
				required
				autocomplete="off"
			/>
			{#if usernameError}
				<p id="username-error" class="error" role="alert">{usernameError}</p>
			{/if}
		</div>

		{#if mode === 'join'}
			<div class="form-group">
				<label for="slug">Type in the code your friend shared:</label>
				<input
					id="slug"
					type="text"
					bind:value={slug}
					placeholder="s_XXXXXX"
					disabled={Boolean(sharedSlug) || loading}
					aria-invalid={!!slugError}
					aria-describedby={slugError ? 'slug-error' : undefined}
					required
					autocomplete="off"
				/>
				{#if slugError}
					<p id="slug-error" class="error" role="alert">{slugError}</p>
				{/if}
			</div>
		{/if}

		{#if error}
			<p class="error general" role="alert">{error}</p>
		{/if}
	</form>
</main>
<footer>
	{#if mode === 'create'}
		<button type="submit" form="init-session" disabled={!canSubmit || loading}>
			{loading ? 'Creating...' : 'Create Session'}
		</button>
		<button
			class="alternative"
			type="button"
			onclick={() => (mode = 'join')}
			disabled={loading}
			aria-label="Switch to join session mode"
		>
			Want to join a friend instead?
		</button>
	{/if}

	{#if mode === 'join'}
		<button type="submit" form="init-session" disabled={!canSubmit || loading}>
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
		margin: 0.5rem 0 0 0;
		font-size: 0.9rem;
	}

	.error.general {
		margin-top: 1rem;
	}

	button.alternative {
		background: none;
		border: none;
		color: var(--color-text-subtle);
		font-style: italic;
		transition: all 200ms ease;
		margin-top: 0.5rem;
	}

	button.alternative:hover:not(:disabled) {
		text-decoration: underline;
	}

	button.alternative:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
