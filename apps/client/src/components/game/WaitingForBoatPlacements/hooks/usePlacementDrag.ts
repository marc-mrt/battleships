import { GRID_SIZE } from "game-rules";
import { useEffect, useState } from "react";
import type { Action } from "../types";

interface PointerPosition {
  x: number;
  y: number;
}

interface UsePlacementDragPayload {
  isDragging: boolean;
  gridRef: React.RefObject<HTMLDivElement>;
  dispatch: React.Dispatch<Action>;
}

interface UsePlacementDragResult {
  pointer: PointerPosition;
  setPointer: (pos: PointerPosition) => void;
}

export function usePlacementDrag(
  payload: UsePlacementDragPayload,
): UsePlacementDragResult {
  const { isDragging, gridRef, dispatch } = payload;
  const [pointer, setPointer] = useState<PointerPosition>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;

    function handlePointerMove(event: PointerEvent): void {
      setPointer({ x: event.clientX, y: event.clientY });

      const grid = gridRef.current;
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        dispatch({ type: "SET_HOVERED_CELL", position: null });
        return;
      }

      const cellWidth = rect.width / GRID_SIZE;
      const cellHeight = rect.height / GRID_SIZE;
      const cellX = Math.floor(x / cellWidth);
      const cellY = Math.floor(y / cellHeight);

      if (cellX >= 0 && cellX < GRID_SIZE && cellY >= 0 && cellY < GRID_SIZE) {
        dispatch({
          type: "SET_HOVERED_CELL",
          position: { x: cellX, y: cellY },
        });
      }
    }

    function handlePointerUp(): void {
      dispatch({ type: "END_DRAG" });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, gridRef, dispatch]);

  return { pointer, setPointer };
}
