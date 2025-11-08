import type { CellState } from '../grid/types';
import type { GameState as ServerGameState } from 'game-messages';
import { GRID_SIZE } from 'game-rules';

export function renderPlayerGrid(serverGame: ServerGameState): CellState[][] {
	const cells: CellState[][] = Array.from({ length: GRID_SIZE }, () =>
		Array.from({ length: GRID_SIZE }, () => ({})),
	);

	serverGame.player.boats.forEach((boat) => {
		for (let i = 0; i < boat.length; i++) {
			const x = boat.orientation === 'horizontal' ? boat.startX + i : boat.startX;
			const y = boat.orientation === 'vertical' ? boat.startY + i : boat.startY;
			if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
				cells[y][x].boat = true;
			}
		}
	});

	serverGame.opponent.shotsAgainstPlayer.forEach((shot) => {
		if (shot.x >= 0 && shot.x < GRID_SIZE && shot.y >= 0 && shot.y < GRID_SIZE) {
			cells[shot.y][shot.x].shot = true;
			cells[shot.y][shot.x].hit = shot.hit;
			cells[shot.y][shot.x].miss = !shot.hit;
		}
	});

	return cells;
}

export function renderOpponentGrid(serverGame: ServerGameState): CellState[][] {
	const cells: CellState[][] = Array.from({ length: GRID_SIZE }, () =>
		Array.from({ length: GRID_SIZE }, () => ({})),
	);

	serverGame.player.shots.forEach((shot) => {
		if (shot.x >= 0 && shot.x < GRID_SIZE && shot.y >= 0 && shot.y < GRID_SIZE) {
			cells[shot.y][shot.x].shot = true;
			cells[shot.y][shot.x].hit = shot.hit;
			cells[shot.y][shot.x].miss = !shot.hit;
		}
	});

	serverGame.opponent.sunkBoats.forEach((boat) => {
		for (let i = 0; i < boat.length; i++) {
			const x = boat.orientation === 'horizontal' ? boat.startX + i : boat.startX;
			const y = boat.orientation === 'vertical' ? boat.startY + i : boat.startY;
			if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
				cells[y][x].sunk = true;
			}
		}
	});

	return cells;
}
