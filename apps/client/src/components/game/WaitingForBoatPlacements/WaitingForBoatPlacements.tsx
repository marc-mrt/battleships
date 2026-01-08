import type { BoatPlacement } from "game-messages";
import { TOTAL_BOATS_COUNT } from "game-rules";
import { useRef, useState } from "react";
import { placeBoats } from "@/app-store";
import { Button, PageLayout, Subtitle, Title } from "@/components/ui";
import { usePlacementDrag } from "./hooks/usePlacementDrag";
import { usePlacementReducer } from "./hooks/usePlacementReducer";
import { canPlaceBoat, findBoatAtPosition, getBoatCells } from "./operations";
import type { Boat, Position } from "./types";
import { BoatStock } from "./ui/BoatStock";
import { FloatingBoat } from "./ui/FloatingBoat";
import { Grid } from "./ui/Grid";

export function WaitingForBoatPlacements(): JSX.Element {
  const [state, dispatch] = usePlacementReducer();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const { pointer, setPointer } = usePlacementDrag({
    isDragging: state.drag.isDragging,
    gridRef,
    dispatch,
  });

  const isComplete = state.boats.length === TOTAL_BOATS_COUNT;

  function handleStockPointerDown(
    length: number,
    event: React.PointerEvent,
  ): void {
    event.preventDefault();
    setPointer({ x: event.clientX, y: event.clientY });
    dispatch({ type: "START_DRAG_FROM_STOCK", length });
  }

  function handleCellPointerDown(
    x: number,
    y: number,
    event: React.PointerEvent,
  ): void {
    const boat = findBoatAtPosition(state.boats, x, y);

    if (boat) {
      event.preventDefault();
      setPointer({ x: event.clientX, y: event.clientY });
      dispatch({
        type: "START_DRAG_FROM_GRID",
        boatId: boat.id,
        offset: { x: x - boat.startX, y: y - boat.startY },
      });
    }
  }

  function handleCellClick(x: number, y: number): void {
    if (state.drag.isDragging) return;

    const boat = findBoatAtPosition(state.boats, x, y);

    if (boat) {
      if (boat.id === state.selectedBoatId) {
        dispatch({ type: "ROTATE_SELECTED" });
      } else {
        dispatch({ type: "SELECT_BOAT", boatId: boat.id });
      }
    } else {
      dispatch({ type: "SELECT_BOAT", boatId: null });
    }
  }

  function handleReadyClick(): void {
    if (!isComplete || hasSubmitted) return;
    setHasSubmitted(true);

    const boatPlacements: BoatPlacement[] = state.boats.map((boat) => ({
      id: boat.id,
      startX: boat.startX,
      startY: boat.startY,
      length: boat.length,
      orientation: boat.orientation,
    }));

    placeBoats(boatPlacements);
  }

  function handleDeleteSelected(): void {
    dispatch({ type: "DELETE_SELECTED" });
  }

  const previewCells = getPreviewCells(state.drag, state.boats);
  const isPreviewValid = getIsPreviewValid(
    state.drag,
    state.boats,
    previewCells,
  );

  const header = (
    <div className="text-center">
      <Title>{hasSubmitted ? "Your Fleet" : "Place Your Fleet"}</Title>
      <Subtitle>
        {hasSubmitted
          ? "Waiting for opponent to place their boats..."
          : "Drag boats to the grid • Tap placed boats to rotate"}
      </Subtitle>
    </div>
  );

  const footer = hasSubmitted ? null : (
    <div className="flex flex-col gap-2 pb-4">
      {state.selectedBoatId && (
        <Button
          ariaLabel="Delete selected boat"
          variant="option"
          onClick={handleDeleteSelected}
        >
          Delete Selected Boat
        </Button>
      )}
      <Button
        ariaLabel="Ready to play"
        disabled={!isComplete}
        onClick={handleReadyClick}
      >
        Ready ({state.boats.length}/{TOTAL_BOATS_COUNT})
      </Button>
    </div>
  );

  return (
    <PageLayout header={header} footer={footer}>
      <div className="flex flex-col gap-2 items-center">
        <Grid
          boats={state.boats}
          selectedBoatId={state.selectedBoatId}
          draggedBoatId={state.drag.sourceBoatId}
          previewCells={previewCells}
          isPreviewValid={isPreviewValid}
          gridRef={gridRef}
          onCellClick={handleCellClick}
          onCellPointerDown={handleCellPointerDown}
          isReadonly={hasSubmitted}
        />
        {!hasSubmitted && (
          <BoatStock
            stock={state.stock}
            onPointerDown={handleStockPointerDown}
          />
        )}
      </div>
      {!hasSubmitted && state.drag.isDragging && (
        <FloatingBoat
          length={state.drag.boatLength}
          orientation={state.drag.orientation}
          x={pointer.x}
          y={pointer.y}
        />
      )}
    </PageLayout>
  );
}

interface DragInfo {
  isDragging: boolean;
  hoveredCell: Position | null;
  offset: Position;
  boatLength: number;
  orientation: "horizontal" | "vertical";
  sourceBoatId: string | null;
}

function getPreviewCells(drag: DragInfo, _boats: Boat[]): Position[] {
  if (!drag.isDragging || !drag.hoveredCell) return [];

  const previewBoat: Boat = {
    id: "preview",
    startX: drag.hoveredCell.x - drag.offset.x,
    startY: drag.hoveredCell.y - drag.offset.y,
    length: drag.boatLength,
    orientation: drag.orientation,
  };

  return getBoatCells(previewBoat);
}

function getIsPreviewValid(
  drag: DragInfo,
  boats: Boat[],
  previewCells: Position[],
): boolean {
  if (!drag.isDragging || !drag.hoveredCell || previewCells.length === 0) {
    return false;
  }

  const previewBoat: Boat = {
    id: "preview",
    startX: drag.hoveredCell.x - drag.offset.x,
    startY: drag.hoveredCell.y - drag.offset.y,
    length: drag.boatLength,
    orientation: drag.orientation,
  };

  return canPlaceBoat({
    boat: previewBoat,
    boats,
    excludeBoatId: drag.sourceBoatId || undefined,
  });
}
