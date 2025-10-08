<script lang="ts">
	import Trash from '../../icons/Trash.svelte';
	import Rotate from '../../icons/Rotate.svelte';

	interface Props {
		selectedBoatId: string | null;
		onRotate: () => void;
		onDelete: () => void;
	}

	let { selectedBoatId, onRotate, onDelete }: Props = $props();
</script>

<div class="selected-boat-actions">
	{#if selectedBoatId}
		<button onclick={onRotate} class="action-btn" title="Rotate boat">
			<Rotate />
		</button>
		<button onclick={onDelete} class="action-btn delete" title="Delete boat">
			<Trash />
		</button>
	{/if}
</div>

<style>
	.selected-boat-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin: 0.5rem 0;
		min-height: 32px;
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		padding: 0 1rem;
		font-size: 1rem;
	}

	.delete:hover {
		background: var(--color-text-error);
		border-color: var(--color-text-error);
	}
</style>
