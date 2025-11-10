<script lang="ts">
	import { appStore } from '../app-store/store.svelte';
	import { validateUsername, validateSlug } from './session-validators';

	interface Props {
		sharedSlug?: string | null;
	}

	let { sharedSlug = null }: Props = $props();

	function shouldValidateUsername(loading: boolean, username: string): boolean {
		return !loading && username.length > 0;
	}

	function shouldValidateSlug(mode: 'create' | 'join', loading: boolean, slug: string): boolean {
		return mode === 'join' && !loading && slug.length > 0;
	}

	function getValidationError(isValid: boolean, errorMessage: string | null): string | null {
		return isValid ? null : errorMessage;
	}

	function extractErrorMessage(e: unknown, fallback: string): string {
		return e instanceof Error ? e.message : fallback;
	}

	function trimmedUsername(username: string): string {
		return username.trim();
	}

	function trimmedSlug(slug: string): string {
		return slug.trim();
	}

	function hasValidUsername(username: string): boolean {
		return trimmedUsername(username).length > 0;
	}

	function canSubmitForm(
		usernameError: string | null,
		slugError: string | null,
		loading: boolean,
		username: string,
	): boolean {
		return !usernameError && !slugError && !loading && hasValidUsername(username);
	}

	let mode = $state<'create' | 'join'>(sharedSlug ? 'join' : 'create');
	let username = $state('');
	let slug = $state(sharedSlug ?? '');
	let loading = $state(false);
	let error = $state('');

	function validateUsernameField(): string | null {
		if (!shouldValidateUsername(loading, username)) return null;
		const result = validateUsername(username);
		return getValidationError(result.valid, result.error);
	}

	function validateSlugField(): string | null {
		if (!shouldValidateSlug(mode, loading, slug)) return null;
		const result = validateSlug(slug);
		return getValidationError(result.valid, result.error);
	}

	const usernameError = $derived(validateUsernameField());
	const slugError = $derived(validateSlugField());
	const canSubmit = $derived(canSubmitForm(usernameError, slugError, loading, username));

	function startLoading(): void {
		loading = true;
		error = '';
	}

	function finishLoading(): void {
		loading = false;
	}

	function setError(message: string): void {
		error = message;
	}

	async function handleCreateSession(): Promise<void> {
		if (!canSubmit) return;

		startLoading();

		try {
			await appStore.createSession({ username: trimmedUsername(username) });
		} catch (e) {
			setError(extractErrorMessage(e, 'Failed to create session'));
		} finally {
			finishLoading();
		}
	}

	async function handleJoinSession(): Promise<void> {
		if (!canSubmit || mode !== 'join') return;

		startLoading();

		try {
			await appStore.joinSession({
				username: trimmedUsername(username),
				slug: trimmedSlug(slug),
			});
		} catch (e) {
			setError(extractErrorMessage(e, 'Failed to join session'));
		} finally {
			finishLoading();
		}
	}

	function isCreateMode(): boolean {
		return mode === 'create';
	}

	function handleSubmit(): void {
		if (isCreateMode()) {
			handleCreateSession();
		} else {
			handleJoinSession();
		}
	}

	function switchToJoinMode(): void {
		mode = 'join';
	}

	function preventDefaultAndSubmit(e: Event): void {
		e.preventDefault();
		handleSubmit();
	}
</script>

<header>
	<h1>Battleships</h1>
</header>
<main>
	<form
		id="init-session"
		onsubmit={preventDefaultAndSubmit}
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
			onclick={switchToJoinMode}
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
