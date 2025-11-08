<script lang="ts">
	import { appStore } from '../app-store/store.svelte';
	import { ClipboardManager } from './clipboard.svelte';

	const player = $derived(appStore.player);
	const slug = $derived(appStore.session?.slug);

	const urlToShare = $derived(`${window.location.origin}?s=${slug}`);
	const clipboard = new ClipboardManager();

	function copyToClipboard() {
		if (slug) {
			clipboard.copy(urlToShare);
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
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
				value={clipboard.isCopied ? 'Copied!' : urlToShare}
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
		margin-bottom: 0.5rem;
	}

	p.subtle {
		font-size: 0.7em;
		color: var(--color-text-subtle);
		margin: 0;
	}

	footer {
		margin-top: 0.5rem;
	}

	input[readonly] {
		background: var(--color-bg, #fff);
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 0.4em 0.7em;
		font-size: 1em;
		outline: none;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		caret-color: transparent;
	}

	input[readonly]:hover,
	input[readonly]:focus {
		border-color: #888;
		box-shadow: 0 0 0 2px #e0e0e0;
		cursor: pointer;
	}

	input.copied {
		color: #2e7d32;
		border-color: #2e7d32;
		background: #e8f5e9;
	}
</style>
