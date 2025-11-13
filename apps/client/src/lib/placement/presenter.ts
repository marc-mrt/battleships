import * as R from 'ramda';
import type { PlacementState, CellState, Position, DragState } from '../grid/types';
import { getBoatCells, getCell } from '../grid/operations';
import { canPlaceBoat } from './operations';

function isBoatDragged(
	cell: { boatId: string | null } | null,
	draggedBoatId: string | null,
): boolean {
	return draggedBoatId !== null && cell?.boatId === draggedBoatId;
}

function isBoatSelected(
	cell: { boatId: string | null } | null,
	selectedBoatId: string | null,
	isDragging: boolean,
): boolean {
	return selectedBoatId !== null && cell?.boatId === selectedBoatId && !isDragging;
}

function hasBoat(
	cell: { occupied: boolean; boatId: string | null } | null,
	draggedBoatId: string | null,
): boolean {
	return cell?.occupied === true && !isBoatDragged(cell, draggedBoatId);
}

function createCellState(
	cell: { occupied: boolean; boatId: string | null } | null,
	selectedBoatId: string | null,
	drag: DragState,
	draggedBoatId: string | null,
	previewInfo: { isPreview: boolean; isValid: boolean },
): CellState {
	const boat = hasBoat(cell, draggedBoatId);
	const selected = isBoatSelected(cell, selectedBoatId, drag.isDragging);
	const preview = previewInfo.isPreview;
	const validDrop = previewInfo.isPreview && previewInfo.isValid;
	const invalidDrop = previewInfo.isPreview && !previewInfo.isValid;

	return {
		boat,
		selected,
		preview,
		validDrop,
		invalidDrop,
	};
}

function createPreviewBoat(drag: DragState) {
	return {
		id: drag.originalBoat?.id || 'preview',
		startX: drag.hoveredCell!.x - drag.offset.x,
		startY: drag.hoveredCell!.y - drag.offset.y,
		length: drag.boatLength!,
		orientation: drag.orientation,
	};
}

function positionsMatch(cell: Position, target: Position): boolean {
	return cell.x === target.x && cell.y === target.y;
}

function isPositionMatch(target: Position) {
	return function matchPosition(cell: Position): boolean {
		return positionsMatch(cell, target);
	};
}

function isPositionInCells(pos: Position, cells: Position[]): boolean {
	return cells.some(isPositionMatch(pos));
}

function getPreviewInfo(
	pos: Position,
	state: PlacementState,
	drag: DragState,
	draggedBoatId: string | null,
): { isPreview: boolean; isValid: boolean } {
	if (!drag.isDragging || !drag.boatLength || !drag.hoveredCell) {
		return { isPreview: false, isValid: false };
	}

	const previewBoat = createPreviewBoat(drag);
	const cells = getBoatCells(previewBoat);
	const isPreview = isPositionInCells(pos, cells);
	const isValid = canPlaceBoat({
		state,
		boat: previewBoat,
		excludeBoatId: draggedBoatId || undefined,
	});

	return { isPreview, isValid };
}

function renderCell(
	state: PlacementState,
	selectedBoatId: string | null,
	drag: DragState,
	draggedBoatId: string | null,
	pos: Position,
): CellState {
	const cell = getCell(state.grid, pos);
	const previewInfo = getPreviewInfo(pos, state, drag, draggedBoatId);
	return createCellState(cell, selectedBoatId, drag, draggedBoatId, previewInfo);
}

function createPosition(x: number, y: number): Position {
	return { x, y };
}

function createCellRenderer(
	state: PlacementState,
	selectedBoatId: string | null,
	drag: DragState,
	draggedBoatId: string | null,
	y: number,
) {
	return function renderCellAtX(x: number): CellState {
		const position = createPosition(x, y);
		return renderCell(state, selectedBoatId, drag, draggedBoatId, position);
	};
}

function renderRow(
	state: PlacementState,
	selectedBoatId: string | null,
	drag: DragState,
	draggedBoatId: string | null,
	y: number,
	size: number,
): CellState[] {
	const cellRenderer = createCellRenderer(state, selectedBoatId, drag, draggedBoatId, y);
	return R.times(cellRenderer, size);
}

function createRowRenderer(
	state: PlacementState,
	selectedBoatId: string | null,
	drag: DragState,
	draggedBoatId: string | null,
	size: number,
) {
	return function renderRowAtY(y: number): CellState[] {
		return renderRow(state, selectedBoatId, drag, draggedBoatId, y, size);
	};
}

export function renderPlacementCells(
	state: PlacementState,
	selectedBoatId: string | null,
	drag: DragState,
	draggedBoatId: string | null,
): CellState[][] {
	const size = state.grid.size;
	const rowRenderer = createRowRenderer(state, selectedBoatId, drag, draggedBoatId, size);
	return R.times(rowRenderer, size);
}
