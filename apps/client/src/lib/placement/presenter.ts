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

interface CreateCellStatePayload {
	cell: { occupied: boolean; boatId: string | null } | null;
	selectedBoatId: string | null;
	drag: DragState;
	draggedBoatId: string | null;
	previewInfo: { isPreview: boolean; isValid: boolean };
}

function createCellState(payload: CreateCellStatePayload): CellState {
	const { cell, selectedBoatId, drag, draggedBoatId, previewInfo } = payload;
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

interface GetPreviewInfoPayload {
	pos: Position;
	state: PlacementState;
	drag: DragState;
	draggedBoatId: string | null;
}

function getPreviewInfo(payload: GetPreviewInfoPayload): { isPreview: boolean; isValid: boolean } {
	const { pos, state, drag, draggedBoatId } = payload;
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

interface RenderCellPayload {
	state: PlacementState;
	selectedBoatId: string | null;
	drag: DragState;
	draggedBoatId: string | null;
	pos: Position;
}

function renderCell(payload: RenderCellPayload): CellState {
	const { state, selectedBoatId, drag, draggedBoatId, pos } = payload;
	const cell = getCell(state.grid, pos);
	const previewInfo = getPreviewInfo({ pos, state, drag, draggedBoatId });
	return createCellState({ cell, selectedBoatId, drag, draggedBoatId, previewInfo });
}

function createPosition(x: number, y: number): Position {
	return { x, y };
}

interface CreateCellRendererPayload {
	state: PlacementState;
	selectedBoatId: string | null;
	drag: DragState;
	draggedBoatId: string | null;
	y: number;
}

function createCellRenderer(payload: CreateCellRendererPayload) {
	const { state, selectedBoatId, drag, draggedBoatId, y } = payload;
	return function renderCellAtX(x: number): CellState {
		const position = createPosition(x, y);
		return renderCell({ state, selectedBoatId, drag, draggedBoatId, pos: position });
	};
}

interface RenderRowPayload {
	state: PlacementState;
	selectedBoatId: string | null;
	drag: DragState;
	draggedBoatId: string | null;
	y: number;
	size: number;
}

function renderRow(payload: RenderRowPayload): CellState[] {
	const { state, selectedBoatId, drag, draggedBoatId, y, size } = payload;
	const cellRenderer = createCellRenderer({ state, selectedBoatId, drag, draggedBoatId, y });
	return R.times(cellRenderer, size);
}

interface CreateRowRendererPayload {
	state: PlacementState;
	selectedBoatId: string | null;
	drag: DragState;
	draggedBoatId: string | null;
	size: number;
}

function createRowRenderer(payload: CreateRowRendererPayload) {
	const { state, selectedBoatId, drag, draggedBoatId, size } = payload;
	return function renderRowAtY(y: number): CellState[] {
		return renderRow({ state, selectedBoatId, drag, draggedBoatId, y, size });
	};
}

interface RenderPlacementCellsPayload {
	state: PlacementState;
	selectedBoatId: string | null;
	drag: DragState;
	draggedBoatId: string | null;
}

export function renderPlacementCells(payload: RenderPlacementCellsPayload): CellState[][] {
	const { state, selectedBoatId, drag, draggedBoatId } = payload;
	const size = state.grid.size;
	const rowRenderer = createRowRenderer({ state, selectedBoatId, drag, draggedBoatId, size });
	return R.times(rowRenderer, size);
}
