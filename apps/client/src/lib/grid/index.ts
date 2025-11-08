export type {
	Position,
	Orientation,
	Boat,
	Cell,
	BoatStock,
	Shot,
	GridState,
	PlacementState,
	DragState,
	PlacementUIState,
	CellState,
} from './types';

export {
	createEmptyGrid,
	getCell,
	setCell,
	setCells,
	isValidPosition,
	getBoatCells,
	toggleOrientation,
	generateBoatId,
} from './operations';

export { default as BattleGrid } from './BattleGrid.svelte';
