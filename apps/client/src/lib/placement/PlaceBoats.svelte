<script lang="ts">
	import * as R from 'ramda';
	import { appStore } from '../app-store/store.svelte';
	import BoatPlacementGrid from './BoatPlacementGrid.svelte';
	import type { PlaceBoatsMessage } from 'game-messages';
	import Trash from '../icons/Trash.svelte';
	import Rotate from '../icons/Rotate.svelte';
	import { PlacementStore } from './store.svelte';
	import { TOTAL_BOATS_COUNT } from 'game-rules';
	import * as GridOps from '../grid/operations';

	function identity<T>(x: T): T {
		return x;
	}

	const player = $derived(appStore.player);
	const opponent = $derived(appStore.opponent);

	const placement = new PlacementStore();

	let isReady = $state(false);

	function sendBoatPlacements(): void {
		if (placement.boats.length === 0) return;

		const message: PlaceBoatsMessage = {
			type: 'place_boats',
			data: { boats: placement.boats },
		};
		appStore.sendAction(message);
		isReady = true;
	}

	let pointerX = $state(0);
	let pointerY = $state(0);
	let isDraggingFromStock = $state(false);

	function handlePointerStartFromStock(length: number): void {
		isDraggingFromStock = true;
		placement.startDragFromStock(length);
	}

	function handlePointerEnd(): void {
		isDraggingFromStock = false;
		placement.endDrag();
	}

	function handleGlobalPointerMove(e: PointerEvent): void {
		if (!placement.isDragging) return;

		pointerX = e.clientX;
		pointerY = e.clientY;

		const gridSection = document.querySelector('.grid');
		if (!gridSection) return;

		const rect = gridSection.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
			placement.setHoveredCell(null);
			return;
		}

		const cellWidth = rect.width / 9;
		const cellHeight = rect.height / 9;

		const cellX = Math.floor(x / cellWidth);
		const cellY = Math.floor(y / cellHeight);

		if (cellX >= 0 && cellX < 9 && cellY >= 0 && cellY < 9) {
			placement.setHoveredCell({ x: cellX, y: cellY });
		}
	}

	function handleCellClick(x: number, y: number): void {
		if (placement.isDragging) return;

		const clickedBoat = placement.boats.find((boat) => {
			const cells = GridOps.getBoatCells(boat);
			return cells.some((cell) => cell.x === x && cell.y === y);
		});

		if (clickedBoat && clickedBoat.id === placement.selectedBoatId) {
			placement.rotateSelected();
		} else {
			placement.selectBoat(x, y);
		}
	}

	function handleCellPointerStart(x: number, y: number): void {
		placement.startDragFromCell(x, y);
	}

	function handleCellPointerMove(x: number, y: number): void {
		if (placement.isDragging) {
			placement.setHoveredCell({ x, y });
		}
	}

	function handleRotateSelected(): void {
		placement.rotateSelected();
	}

	function handleDeleteSelected(): void {
		placement.deleteSelected();
	}

	function handleStockPointerDown(length: number) {
		return function onPointerDown(e: PointerEvent) {
			e.preventDefault();
			handlePointerStartFromStock(length);
		};
	}
</script>

<svelte:window onpointermove={handleGlobalPointerMove} onpointerup={handlePointerEnd} />

{#if isDraggingFromStock && placement.draggedBoatLength > 0}
	<div
		class="floating-boat"
		style="left: {pointerX}px; top: {pointerY}px;"
		class:horizontal={placement.draggedBoatOrientation === 'horizontal'}
		class:vertical={placement.draggedBoatOrientation === 'vertical'}
	>
		{#each R.times(identity, placement.draggedBoatLength) as idx (idx)}
			<div class="floating-boat-segment"></div>
		{/each}
	</div>
{/if}

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
					{#each placement.stock as stock (stock.length)}
						{@const isAvailable = stock.placed < stock.count}
						<div class="stock-item" class:depleted={!isAvailable}>
							<div
								class="boat-visual"
								class:depleted={!isAvailable}
								class:draggable={isAvailable}
								onpointerdown={isAvailable ? handleStockPointerDown(stock.length) : undefined}
								role="button"
								tabindex={isAvailable ? 0 : -1}
							>
								{#each R.times(identity, stock.length) as idx (idx)}
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
				<BoatPlacementGrid
					cells={placement.cells}
					onCellClick={handleCellClick}
					onCellPointerStart={handleCellPointerStart}
					onCellPointerMove={handleCellPointerMove}
				/>

				<div class="selected-boat-actions">
					{#if placement.selectedBoatId}
						<button
							onclick={handleRotateSelected}
							class="action-btn"
							title="Rotate boat"
							aria-label="Rotate selected boat"
						>
							<Rotate />
						</button>
						<button
							onclick={handleDeleteSelected}
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
			disabled={!placement.isComplete}
			aria-label={placement.isComplete
				? 'Submit boat placements'
				: `Place ${TOTAL_BOATS_COUNT - placement.boats.length} more boats`}
		>
			Ready {placement.isComplete
				? ''
				: `(${placement.boats.length}/${TOTAL_BOATS_COUNT} boats placed)`}
		</button>
	{:else}
		<div class="status-message">Waiting for opponent to place boats...</div>
	{/if}
</footer>

<style>
	header {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--spacing-xs);
	}

	header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		width: 100%;
		align-items: center;
	}

	@media (min-width: 640px) {
		.container {
			flex-direction: row;
			align-items: flex-start;
		}
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		width: 100%;
		max-width: 400px;
	}

	@media (min-width: 640px) {
		.controls-section {
			min-width: 140px;
			max-width: 160px;
		}
	}

	.grid-section {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		width: 100%;
	}

	.boat-stock {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.boat-stock h5 {
		margin: 0 0 var(--spacing-xs) 0;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
	}

	@media (min-width: 640px) {
		.boat-stock h5 {
			font-size: 0.85rem;
			text-align: left;
		}
	}

	.stock-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: 0.6rem var(--spacing-sm);
		border: 1px solid var(--color-accent);
		border-radius: var(--border-radius-lg);
		background: white;
		transition: opacity var(--transition-normal);
	}

	@media (min-width: 640px) {
		.stock-item {
			gap: var(--spacing-xs);
			padding: var(--spacing-xs) var(--spacing-xs);
			border-radius: var(--border-radius-md);
			min-height: auto;
		}
	}

	.stock-item.depleted {
		opacity: 0.3;
		border-color: var(--color-border-light);
	}

	.boat-visual {
		display: flex;
		gap: 1px;
		flex: 1;
		user-select: none;
		transition: all var(--transition-normal);
		touch-action: none;
	}

	.boat-visual.draggable {
		cursor: grab;
	}

	@media (hover: hover) and (pointer: fine) {
		.boat-visual.draggable:hover {
			animation: pulse var(--animation-pulse) ease-in-out infinite;
		}
	}

	.boat-visual.depleted {
		cursor: not-allowed;
	}

	.boat-visual.draggable:active {
		cursor: grabbing;
	}

	.boat-segment {
		width: 20px;
		height: 20px;
		background: var(--color-boat);
	}

	@media (min-width: 640px) {
		.boat-segment {
			width: 16px;
			height: 16px;
		}
	}

	.stock-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.boat-count {
		font-size: 0.75rem;
		opacity: 0.6;
		line-height: 1;
	}

	@media (min-width: 640px) {
		.boat-count {
			font-size: 0.65rem;
		}
	}

	.selected-boat-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-sm);
		margin: var(--spacing-sm) 0;
	}

	@media (min-width: 640px) {
		.selected-boat-actions {
			gap: var(--spacing-xs);
			margin: var(--spacing-xs) 0;
			min-height: 32px;
		}
	}

	.status-message {
		color: var(--color-text-muted, #666);
		font-style: italic;
	}

	footer {
		margin-top: var(--spacing-md);
		text-align: center;
	}

	.ready-button {
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: 1.05rem;
		font-weight: 600;
		transition: all var(--transition-normal);
		min-height: 52px;
	}

	@media (min-width: 640px) {
		.ready-button {
			padding: var(--spacing-xs) var(--spacing-md);
			font-size: 1rem;
		}
	}

	.ready-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.floating-boat {
		position: fixed;
		display: flex;
		gap: 1px;
		pointer-events: none;
		transform: translate(-50%, -50%);
		z-index: var(--z-index-floating);
		opacity: 0.8;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
	}

	.floating-boat.horizontal {
		flex-direction: row;
	}

	.floating-boat.vertical {
		flex-direction: column;
	}

	.floating-boat-segment {
		width: 24px;
		height: 24px;
		background: var(--color-boat);
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	@media (min-width: 640px) {
		.floating-boat-segment {
			width: 20px;
			height: 20px;
		}
	}
</style>
