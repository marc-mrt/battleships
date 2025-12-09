<script lang="ts">
import type { GameState } from "game-messages";
import { GRID_SIZE } from "game-rules";
import { onDestroy } from "svelte";
import { appStore } from "../app-store/store.svelte";
import { createEmptyCellGrid } from "../grid/render-utils";
import type { CellState } from "../grid/types";
import { createEffectManager } from "./effect-manager.svelte";
import { renderOpponentGrid, renderPlayerGrid } from "./presenter";
import ShootingGrid from "./ShootingGrid.svelte";
import WaitingGrid from "./WaitingGrid.svelte";

const isOwner = $derived(appStore.isOwner);

function shouldResetGame(rawGame: GameState | null): boolean {
  return !rawGame;
}

function shouldInitializeGame(displayedGame: GameState | null): boolean {
  return !displayedGame;
}

function hasGameChanged(rawGame: GameState, displayedGame: GameState): boolean {
  return rawGame !== displayedGame;
}

function getHitResult(hit: boolean): "hit" | "miss" {
  return hit ? "hit" : "miss";
}

function isPlayerTurn(turn: string): boolean {
  return turn === "player";
}

function isOpponentTurn(turn: string): boolean {
  return turn === "opponent";
}

function canFireShot(
  effectManager: ReturnType<typeof createEffectManager>,
  pendingGame: GameState | null,
): boolean {
  return !effectManager.isAnimating() && !pendingGame;
}

function buildCellAriaLabel(x: number, y: number): string {
  return `Fire at position ${x}, ${y}`;
}

const player = $derived(appStore.player);
const opponent = $derived(appStore.opponent);
const rawGame = $derived(appStore.game);

const effectManager = createEffectManager();
let displayedGame = $state<GameState | null>(null);
let pendingGame = $state<GameState | null>(null);

const game = $derived(displayedGame);

function computeOpponentTurnCells(): CellState[][] {
  if (!game) return createEmptyCellGrid(GRID_SIZE);
  return renderPlayerGrid(game);
}

function computeYourTurnCells(): CellState[][] {
  if (!game) return createEmptyCellGrid(GRID_SIZE);
  return renderOpponentGrid(game);
}

const opponentTurnCells = $derived.by(computeOpponentTurnCells);

const yourTurnCells = $derived.by(computeYourTurnCells);

function resetGameState() {
  displayedGame = null;
  pendingGame = null;
}

function initializeGame(rawGame: GameState) {
  displayedGame = rawGame;
}

function updatePendingGame(rawGame: GameState) {
  pendingGame = rawGame;
}

function syncGameState(): void {
  if (shouldResetGame(rawGame)) {
    resetGameState();
    return;
  }

  if (!rawGame) {
    return;
  }

  if (shouldInitializeGame(displayedGame)) {
    initializeGame(rawGame);
    return;
  }

  if (!displayedGame) {
    return;
  }

  if (!hasGameChanged(rawGame, displayedGame)) {
    return;
  }

  updatePendingGame(rawGame);
  handleGameStateChange(displayedGame, rawGame);
}

$effect(syncGameState);

function updateDisplayedGame(newGame: GameState) {
  displayedGame = newGame;
  pendingGame = null;
}

async function playShootingAnimation(lastShot: {
  x: number;
  y: number;
  hit: boolean;
  sunkBoat: boolean;
}) {
  await effectManager.playShootingSequence(
    lastShot.x,
    lastShot.y,
    getHitResult(lastShot.hit),
    lastShot.sunkBoat,
  );
}

async function playReceivingAnimation(lastShot: {
  x: number;
  y: number;
  hit: boolean;
  sunkBoat: boolean;
}) {
  await effectManager.playReceivingSequence(
    lastShot.x,
    lastShot.y,
    getHitResult(lastShot.hit),
    lastShot.sunkBoat,
  );
}

async function handleGameStateChange(oldGame: GameState, newGame: GameState) {
  if (oldGame.status !== "in_progress") return;

  const previousTurn = oldGame.turn;
  const lastShot = newGame.lastShot;
  if (!lastShot) {
    return;
  }

  if (isPlayerTurn(previousTurn)) {
    await playShootingAnimation(lastShot);
  } else {
    await playReceivingAnimation(lastShot);
  }

  updateDisplayedGame(newGame);
}

function sendFireShotAction(x: number, y: number) {
  appStore.sendAction({
    type: "fire_shot",
    data: { x, y },
  });
}

function handleCellClick(x: number, y: number) {
  if (!canFireShot(effectManager, pendingGame)) {
    return;
  }

  sendFireShotAction(x, y);
}

function handleNewGameClick(): void {
  appStore.requestNewGame();
}

function cleanup(): void {
  effectManager.reset();
}

onDestroy(cleanup);
</script>

<header>
	<h3 class="player">{player?.username}</h3>
	<h3>{opponent?.username}</h3>
</header>

<main>
	{#if !game}
		<div class="loading">
			<p>Loading game...</p>
		</div>
	{:else if game.status === 'in_progress'}
		{#if isOpponentTurn(game.turn)}
			<div class="turn-view">
				<p class="status-message opponent-turn">Opponent is taking their shot...</p>

				<div class="grid-container">
					<WaitingGrid cells={opponentTurnCells} animationState={effectManager.state} />
				</div>
			</div>
		{:else}
			<div class="turn-view">
				<p class="status-message your-turn">Your turn - Click to fire!</p>

				<div class="grid-container">
					<ShootingGrid
						cells={yourTurnCells}
						onCellClick={handleCellClick}
						getCellAriaLabel={buildCellAriaLabel}
						animationState={effectManager.state}
					/>
				</div>
			</div>
		{/if}
	{:else if game.status === 'over'}
		<div class="game-over">
			<h1>{game.winner === 'player' ? '🎉 Victory!' : '💔 Defeat'}</h1>
			{#if isOwner}
				<button class="new-game-button" onclick={handleNewGameClick}>Start New Game</button>
			{:else}
				<p class="waiting-message">Waiting for game owner to start a new game...</p>
			{/if}
		</div>
	{/if}
</main>

<footer></footer>

<style>
	header {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--spacing-sm);
		gap: var(--spacing-xs);
	}

	header h3 {
		margin: 0;
		font-size: 1.1rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (min-width: 640px) {
		header {
			margin-bottom: var(--spacing-xs);
		}

		header h3 {
			font-size: 1rem;
		}
	}

	.turn-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
	}

	@media (min-width: 640px) {
		.turn-view {
			gap: var(--spacing-md);
		}
	}

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--spacing-xl);
		color: var(--color-text-subtle);
	}

	.grid-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-sm);
		width: 100%;
	}

	@media (min-width: 640px) {
		.grid-container {
			gap: var(--spacing-xs);
		}
	}

	footer {
		margin-top: var(--spacing-md);
		text-align: center;
	}

	.game-over {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xl);
		padding: var(--spacing-lg) var(--spacing-md);
	}

	@media (min-width: 640px) {
		.game-over {
			padding: var(--spacing-xl);
		}
	}

	.game-over h1 {
		font-size: 2.2rem;
		margin: 0;
		text-align: center;
	}

	@media (min-width: 640px) {
		.game-over h1 {
			font-size: 2.5rem;
		}
	}

	.new-game-button {
		padding: var(--spacing-md) var(--spacing-lg);
		font-size: 1.1rem;
		font-weight: 600;
		color: white;
		background-color: var(--color-accent);
		border: none;
		border-radius: var(--border-radius-lg);
		cursor: pointer;
		transition: all var(--transition-normal) ease;
		min-height: 52px;
		width: 100%;
		max-width: 300px;
	}

	@media (min-width: 640px) {
		.new-game-button {
			padding: var(--spacing-md) var(--spacing-xl);
			font-size: 1.2rem;
			min-height: auto;
			width: auto;
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.new-game-button:hover {
			transform: scale(1.05);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		}
	}

	.new-game-button:active {
		transform: scale(0.98);
	}

	.waiting-message {
		font-size: 1rem;
		color: var(--color-text-subtle);
		margin: 0;
		text-align: center;
		padding: 0 var(--spacing-md);
	}

	@media (min-width: 640px) {
		.waiting-message {
			font-size: 1.1rem;
			padding: 0;
		}
	}
</style>
