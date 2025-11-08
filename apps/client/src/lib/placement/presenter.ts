import type { PlacementState, CellState, Position, DragState } from '../grid/types';
import { getBoatCells, getCell } from '../grid/operations';
import { canPlaceBoat } from './operations';

export function renderPlacementCells(
	state: PlacementState,
	selectedBoatId: string | null,
	drag: DragState,
	draggedBoatId: string | null,
): CellState[][] {
	const size = state.grid.size;
	const cells: CellState[][] = [];

	for (let y = 0; y < size; y++) {
		const row: CellState[] = [];
		for (let x = 0; x < size; x++) {
			const cell = getCell(state.grid, { x, y });
			const isDraggedCell = draggedBoatId !== null && cell?.boatId === draggedBoatId;
			const isSelected = selectedBoatId !== null && cell?.boatId === selectedBoatId;
			const previewInfo = getPreviewInfo({ x, y }, state, drag, draggedBoatId);

			row.push({
				boat: cell?.occupied && !isDraggedCell,
				selected: isSelected && !drag.isDragging,
				preview: previewInfo.isPreview,
				validDrop: previewInfo.isPreview && previewInfo.isValid,
				invalidDrop: previewInfo.isPreview && !previewInfo.isValid,
			});
		}
		cells.push(row);
	}

	return cells;
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

	const startX = drag.hoveredCell.x - drag.offset.x;
	const startY = drag.hoveredCell.y - drag.offset.y;

	const previewBoat = {
		id: drag.originalBoat?.id || 'preview',
		startX,
		startY,
		length: drag.boatLength,
		orientation: drag.orientation,
	};

	const cells = getBoatCells(previewBoat);
	const isPreview = cells.some((cell) => cell.x === pos.x && cell.y === pos.y);
	const isValid = canPlaceBoat(state, previewBoat, draggedBoatId || undefined);

	return { isPreview, isValid };
}
