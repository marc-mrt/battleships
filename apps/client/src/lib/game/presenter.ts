import type { CellState } from '../grid/types';
import type { GameState as ServerGameState } from 'game-messages';
import { GRID_SIZE } from 'game-rules';
import { createEmptyCellGrid, applyBoatToCells, applyShotToCells } from '../grid/render-utils';

export function renderPlayerGrid(serverGame: ServerGameState): CellState[][] {
	const cells = createEmptyCellGrid(GRID_SIZE);

	serverGame.player.boats.forEach((boat) => {
		applyBoatToCells(cells, boat, GRID_SIZE, (cell) => {
			cell.boat = true;
		});
	});

	serverGame.opponent.shotsAgainstPlayer.forEach((shot) => {
		applyShotToCells(cells, shot, GRID_SIZE);
	});

	return cells;
}

export function renderOpponentGrid(serverGame: ServerGameState): CellState[][] {
	const cells = createEmptyCellGrid(GRID_SIZE);

	serverGame.player.shots.forEach((shot) => {
		applyShotToCells(cells, shot, GRID_SIZE);
	});

	serverGame.opponent.sunkBoats.forEach((boat) => {
		applyBoatToCells(cells, boat, GRID_SIZE, (cell) => {
			cell.sunk = true;
		});
	});

	return cells;
}
