import * as R from "ramda";
import { getBoatCells, getCell } from "../grid/operations";
import type {
  Boat,
  CellState,
  DragState,
  PlacementState,
  Position,
} from "../grid/types";
import { canPlaceBoat } from "./operations";

interface RenderPlacementCellsPayload {
  state: PlacementState;
  selectedBoatId: string | null;
  drag: DragState;
  draggedBoatId: string | null;
}

export function renderPlacementCells(
  payload: RenderPlacementCellsPayload,
): CellState[][] {
  const { state, selectedBoatId, drag, draggedBoatId } = payload;
  const size = state.grid.size;

  const renderCellAtPosition =
    (y: number) =>
    (x: number): CellState =>
      renderCell({ state, selectedBoatId, drag, draggedBoatId, pos: { x, y } });

  const renderRowAtY = (y: number): CellState[] =>
    R.times(renderCellAtPosition(y), size);

  return R.times(renderRowAtY, size);
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

  const previewCells = getPreviewCells(state, drag);
  const isPreview = R.any(R.whereEq(pos), previewCells);
  const isValidPreview =
    isPreview && isPreviewValid(state, drag, draggedBoatId);
  const hasBoat = cell?.occupied === true && cell.boatId !== draggedBoatId;
  const isSelected =
    selectedBoatId !== null &&
    cell?.boatId === selectedBoatId &&
    !drag.isDragging;

  return {
    boat: hasBoat,
    selected: isSelected,
    preview: isPreview,
    validDrop: isValidPreview,
    invalidDrop: isPreview && !isValidPreview,
  };
}

function getPreviewBoat(drag: DragState): Boat | null {
  if (!drag.isDragging || !drag.boatLength || !drag.hoveredCell) {
    return null;
  }

  return {
    id: drag.originalBoat?.id || "preview",
    startX: drag.hoveredCell.x - drag.offset.x,
    startY: drag.hoveredCell.y - drag.offset.y,
    length: drag.boatLength,
    orientation: drag.orientation,
  };
}

function getPreviewCells(state: PlacementState, drag: DragState): Position[] {
  const previewBoat = getPreviewBoat(drag);
  if (!previewBoat) return [];

  return getBoatCells(previewBoat);
}

function isPreviewValid(
  state: PlacementState,
  drag: DragState,
  draggedBoatId: string | null,
): boolean {
  const previewBoat = getPreviewBoat(drag);
  if (!previewBoat) return false;

  return canPlaceBoat({
    state,
    boat: previewBoat,
    excludeBoatId: draggedBoatId || undefined,
  });
}
