<script lang="ts">
	import type { Player } from '../models/player';
	import { onDestroy } from 'svelte';
	import { GridManager } from './utils/grid-manager.svelte';
	import { BOAT_TYPES } from './utils/boat-utils';
	import BoatStock from './components/BoatStock.svelte';
	import BoatGrid from './components/BoatGrid.svelte';
	import BoatActions from './components/BoatActions.svelte';
	import type { PlayerPlacedBoatsMessage } from 'game-messages';
	import { gameStore } from '../services/game-store.svelte';

	let player: Player | null = $state(null);
	let opponent: Player | null = $state(null);

	const unsubscribe = gameStore.store.subscribe((store) => {
		if (store != null) {
			player = store.player;
			opponent = store.opponent;
		}
	});

	onDestroy(unsubscribe);

	const gridManager = new GridManager();

	let isReady = $state(false);

	const totalBoatsRequired = BOAT_TYPES.reduce((sum, type) => sum + type.count, 0);
	const canSubmit = $derived(gridManager.boats.length === totalBoatsRequired);

	function handleCellDragOver(event: DragEvent, x: number, y: number) {
		event.preventDefault();
		gridManager.setHoveredCell({ x, y });
	}

	function handleGridDragLeave() {
		gridManager.setHoveredCell(null);
	}

	function handleCellClick(cell: { occupied: boolean; boatId: string | null }) {
		if (cell.boatId) {
			gridManager.selectedBoatId = cell.boatId;
		}
	}

	function handleCellDragStart(boat: { length: number; id: string }, x: number, y: number) {
		gridManager.startDrag(boat.length, false, boat.id, x, y);
	}

	function sendBoatPlacements() {
		if (gridManager.boats.length === 0) return;

		const message: PlayerPlacedBoatsMessage = {
			type: 'player-placed-boats',
			data: { boats: gridManager.boats },
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
				<BoatStock
					boatStock={gridManager.boatStock}
					onDragStart={(length) => gridManager.startDrag(length, true)}
					onDragEnd={() => gridManager.endDrag()}
				/>
			</div>

			<div class="grid-section">
				<BoatGrid
					grid={gridManager.grid}
					boats={gridManager.boats}
					selectedBoatId={gridManager.selectedBoatId}
					isPreviewCell={(x, y) => gridManager.isPreviewCell(x, y)}
					isValidPlacement={() => gridManager.isValidPlacement()}
					onCellClick={handleCellClick}
					onCellDragStart={handleCellDragStart}
					onCellDragEnd={() => gridManager.endDrag()}
					onCellDragOver={handleCellDragOver}
					onGridDragLeave={handleGridDragLeave}
				/>

				<BoatActions
					selectedBoatId={gridManager.selectedBoatId}
					onRotate={() => gridManager.rotateSelectedBoat()}
					onDelete={() => gridManager.deleteSelectedBoat()}
				/>
			</div>
		</div>
	{/if}
</main>

<footer>
	{#if !isReady}
		<button class="ready-button" onclick={sendBoatPlacements} disabled={!canSubmit}>
			Ready {canSubmit ? '' : `(${gridManager.boats.length}/${totalBoatsRequired} boats placed)`}
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
</style>
