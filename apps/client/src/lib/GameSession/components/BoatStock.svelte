<script lang="ts">
	import type { BoatStock } from '../utils/grid-manager.svelte';

	interface Props {
		boatStock: BoatStock[];
		onDragStart: (length: number) => void;
		onDragEnd: () => void;
	}

	let { boatStock, onDragStart, onDragEnd }: Props = $props();
</script>

<div class="boat-stock">
	<h5>Place Your Boats:</h5>
	{#each boatStock as stock (stock.length)}
		{@const isAvailable = stock.placed < stock.count}
		<div class="stock-item" class:depleted={!isAvailable}>
			<div
				class="boat-visual"
				draggable={isAvailable}
				ondragstart={() => onDragStart(stock.length)}
				ondragend={onDragEnd}
				class:depleted={!isAvailable}
				role="presentation"
			>
				{#each Array(stock.length) as _, i (i)}
					<div class="boat-segment"></div>
				{/each}
			</div>
			<div class="stock-info">
				<span class="boat-count">{stock.count - stock.placed}/{stock.count}</span>
			</div>
		</div>
	{/each}
</div>

<style>
	.boat-stock {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.boat-stock h5 {
		margin: 0 0 0.25rem 0;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.stock-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-accent);
		border-radius: 4px;
		background: white;
		transition: opacity 0.2s;
	}

	.stock-item.depleted {
		opacity: 0.3;
		border-color: #ccc;
	}

	.boat-visual {
		display: flex;
		gap: 1px;
		flex: 1;
		cursor: grab;
		user-select: none;
		transition: all 0.2s;
	}

	.boat-visual:not(.depleted):hover {
		animation: pulse 1s ease-in-out infinite;
	}

	.boat-visual.depleted {
		cursor: not-allowed;
	}

	.boat-visual:active:not(.depleted) {
		cursor: grabbing;
	}

	.boat-segment {
		width: 16px;
		height: 16px;
		background: var(--color-accent);
	}

	.stock-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.boat-count {
		font-size: 0.65rem;
		opacity: 0.6;
		line-height: 1;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
