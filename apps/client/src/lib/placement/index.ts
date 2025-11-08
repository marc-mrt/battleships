export type { Boat, BoatStock, PlacementState } from '../grid/types';

export {
	createInitialPlacementState,
	canPlaceBoat,
	addBoat,
	removeBoat,
	moveBoat,
	rotateBoat,
	isPlacementComplete,
	getBoatAt,
} from './operations';

export { PlacementStore } from './store.svelte';

export { default as PlaceBoats } from './PlaceBoats.svelte';
