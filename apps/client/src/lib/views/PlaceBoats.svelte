<script lang="ts">
	import { gameStore } from '../services/game-store.svelte';
	import BattleGrid from './BattleGrid.svelte';
	import type { PlaceBoatsMessage } from 'game-messages';
	import Trash from '../icons/Trash.svelte';
	import Rotate from '../icons/Rotate.svelte';
	import { PlaceBoatsState } from './place-boats-state.svelte';

	const player = $derived(gameStore.player);
	const opponent = $derived(gameStore.opponent);

	const placement = new PlaceBoatsState();

	let isReady = $state(false);

	function sendBoatPlacements() {
		if (placement.boats.length === 0) return;

		const message: PlaceBoatsMessage = {
			type: 'place_boats',
			data: { boats: placement.boats },
		};
		gameStore.sendAction(message);
		isReady = true;
	}
</script>

<header>
	<h3 class="player">{player?.username}</h3>
	<h3>{opponent?.username}</h3>
</header>

<main>
	{#if !isReady}
		<div class="container">
			<div class="controls-section">
				<div class="boat-stock">
					<h5>Place Your Boats:</h5>
					{#each placement.boatStock as stock (stock.length)}
						{@const isAvailable = stock.placed < stock.count}
						<div class="stock-item" class:depleted={!isAvailable}>
							<div
								class="boat-visual"
								draggable={isAvailable}
								ondragstart={() => placement.startDrag(stock.length, true)}
								ondragend={() => placement.endDrag()}
								class:depleted={!isAvailable}
								role="presentation"
							>
								{#each Array.from({ length: stock.length }, (_, i) => i) as idx (idx)}
									<div class="boat-segment"></div>
								{/each}
							</div>
							<div class="stock-info">
								<span class="boat-count">{stock.count - stock.placed}/{stock.count}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="grid-section">
				<BattleGrid
					cells={placement.gridCells}
					draggable
					onCellClick={(x, y) => placement.handleCellClick(x, y)}
					onCellDragStart={(x, y) => placement.handleCellDragStart(x, y)}
					onCellDragEnd={() => placement.endDrag()}
					onCellDragOver={(e, x, y) => placement.handleCellDragOver(e, x, y)}
					onGridDragLeave={() => placement.handleGridDragLeave()}
				/>

				<div class="selected-boat-actions">
					{#if placement.selectedBoatId}
						<button
							onclick={() => placement.rotateSelectedBoat()}
							class="action-btn"
							title="Rotate boat"
							aria-label="Rotate selected boat"
						>
							<Rotate />
						</button>
						<button
							onclick={() => placement.deleteSelectedBoat()}
							class="action-btn delete"
							title="Delete boat"
							aria-label="Delete selected boat"
						>
							<Trash />
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</main>

<footer>
	{#if !isReady}
		<button
			class="ready-button"
			onclick={sendBoatPlacements}
			disabled={!placement.canSubmit}
			aria-label={placement.canSubmit
				? 'Submit boat placements'
				: `Place ${placement.totalBoatsRequired - placement.boats.length} more boats`}
		>
			Ready {placement.canSubmit
				? ''
				: `(${placement.boats.length}/${placement.totalBoatsRequired} boats placed)`}
		</button>
	{:else}
		<div class="status-message">Waiting for opponent to place boats...</div>
	{/if}
</footer>

<style>
	header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.player {
		text-decoration: underline;
		text-decoration-color: var(--color-text-success);
	}

	.container {
		display: flex;
		gap: 1rem;
		width: 100%;
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 140px;
		max-width: 160px;
	}

	.grid-section {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
	}

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

	.selected-boat-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin: 0.5rem 0;
		min-height: 32px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		padding: 0 1rem;
		font-size: 1rem;
	}

	.action-btn.delete:hover {
		background: var(--color-text-error);
		border-color: var(--color-text-error);
	}

	.status-message {
		color: var(--color-text-muted, #666);
		font-style: italic;
	}

	footer {
		margin-top: 1rem;
		text-align: center;
	}

	.ready-button {
		padding: 0.5rem 1rem;
		font-size: 1rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.ready-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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
