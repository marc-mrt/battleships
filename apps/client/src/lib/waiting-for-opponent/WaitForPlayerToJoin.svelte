<script lang="ts">
	import { appStore } from '../app-store/store.svelte';
	import { ClipboardManager } from './clipboard.svelte';

	function buildShareableUrl(slug: string | undefined): string {
		return `${window.location.origin}?s=${slug}`;
	}

	function getDisplayValue(isCopied: boolean, url: string): string {
		return isCopied ? 'Copied!' : url;
	}

	function isActivationKey(key: string): boolean {
		return key === 'Enter' || key === ' ';
	}

	const player = $derived(appStore.player);
	const slug = $derived(appStore.session?.slug);

	const urlToShare = $derived(buildShareableUrl(slug));
	const clipboard = new ClipboardManager();

	function copyToClipboard() {
		if (slug) {
			clipboard.copy(urlToShare);
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (isActivationKey(event.key)) {
			event.preventDefault();
			copyToClipboard();
		}
	}
</script>

<header>
	<h1>Hi {player?.username}!</h1>
</header>
<main>
	<div>
		<p>Share this with your friend:</p>
		<div style="display: flex; align-items: center; gap: 0.5em;">
			<input
				type="text"
				readonly
				value={getDisplayValue(clipboard.isCopied, urlToShare)}
				onclick={copyToClipboard}
				onkeydown={handleKeyPress}
				class:copied={clipboard.isCopied}
				aria-label="Copy link to clipboard"
				tabindex="0"
				role="button"
			/>
		</div>
	</div>
</main>
<footer>
	<p class="subtle">Waiting for a friend to join your game...</p>
</footer>

<style>
	header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		gap: 0.5rem;
	}

	@media (min-width: 640px) {
		header {
			margin-bottom: 0.5rem;
		}
	}

	p.subtle {
		font-size: 0.85em;
		color: var(--color-text-subtle);
		margin: 0;
		padding: 0 0.5rem;
	}

	@media (min-width: 640px) {
		p.subtle {
			font-size: 0.7em;
			padding: 0;
		}
	}

	footer {
		margin-top: 1rem;
	}

	@media (min-width: 640px) {
		footer {
			margin-top: 0.5rem;
		}
	}

	input[readonly] {
		background: var(--color-bg, #fff);
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 0.75em 1em;
		font-size: 1em;
		outline: none;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		caret-color: transparent;
		width: 100%;
		text-align: center;
	}

	@media (min-width: 640px) {
		input[readonly] {
			border-radius: 4px;
			padding: 0.4em 0.7em;
			min-height: auto;
			text-align: left;
		}
	}

	@media (hover: hover) and (pointer: fine) {
		input[readonly]:hover {
			border-color: #888;
			box-shadow: 0 0 0 2px #e0e0e0;
		}
	}

	input[readonly]:focus {
		border-color: #888;
		box-shadow: 0 0 0 2px #e0e0e0;
		cursor: pointer;
	}

	input[readonly]:active {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
	}

	input.copied {
		color: #2e7d32;
		border-color: #2e7d32;
		background: #e8f5e9;
	}
</style>
