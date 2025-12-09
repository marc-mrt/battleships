<script lang="ts">
import { appStore } from "../app-store/store.svelte";
import { ClipboardManager } from "./clipboard.svelte";

function buildShareableUrl(slug: string | undefined): string {
  return `${window.location.origin}?s=${slug}`;
}

function getDisplayValue(isCopied: boolean, url: string): string {
  return isCopied ? "Copied!" : url;
}

function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
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
		margin-bottom: var(--spacing-sm);
		gap: var(--spacing-xs);
	}

	@media (min-width: 640px) {
		header {
			margin-bottom: var(--spacing-xs);
		}
	}

	p.subtle {
		font-size: 0.85em;
		color: var(--color-text-subtle);
		margin: 0;
		padding: 0 var(--spacing-xs);
	}

	@media (min-width: 640px) {
		p.subtle {
			font-size: 0.7em;
			padding: 0;
		}
	}

	footer {
		margin-top: var(--spacing-md);
	}

	@media (min-width: 640px) {
		footer {
			margin-top: var(--spacing-xs);
		}
	}

	input[readonly] {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-light);
		border-radius: var(--border-radius-lg);
		padding: 0.75em 1em;
		font-size: 1em;
		outline: none;
		transition:
			border-color var(--transition-normal),
			box-shadow var(--transition-normal);
		caret-color: transparent;
		width: 100%;
		text-align: center;
	}

	@media (min-width: 640px) {
		input[readonly] {
			border-radius: var(--border-radius-md);
			padding: 0.4em 0.7em;
			min-height: auto;
			text-align: left;
		}
	}

	@media (hover: hover) and (pointer: fine) {
		input[readonly]:hover {
			border-color: var(--color-text-muted);
			box-shadow: 0 0 0 2px var(--color-bg-secondary);
		}
	}

	input[readonly]:focus {
		border-color: var(--color-text-muted);
		box-shadow: 0 0 0 2px var(--color-bg-secondary);
		cursor: pointer;
	}

	input[readonly]:active {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
	}

	input.copied {
		color: var(--color-text-success);
		border-color: var(--color-text-success);
		background: var(--color-bg-secondary);
	}
</style>
