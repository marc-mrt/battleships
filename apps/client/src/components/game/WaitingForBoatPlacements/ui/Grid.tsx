import { GRID_SIZE } from "game-rules";
import * as R from "ramda";
import { GameGrid } from "@/components/game/shared";
import { getBoatCells } from "../operations";
import type { Boat, Position } from "../types";
import { GridCell } from "./GridCell";

interface GridProps {
  boats: Boat[];
  selectedBoatId: string | null;
  draggedBoatId: string | null;
  previewCells: Position[];
  isPreviewValid: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  onCellClick: (x: number, y: number) => void;
  onCellPointerDown: (x: number, y: number, event: React.PointerEvent) => void;
  isReadonly?: boolean;
}

export function Grid(props: GridProps): JSX.Element {
  const {
    boats,
    selectedBoatId,
    draggedBoatId,
    previewCells,
    isPreviewValid,
    gridRef,
    onCellClick,
    onCellPointerDown,
    isReadonly = false,
  } = props;

  const boatCellsMap = new Map<
    string,
    { boatId: string; isSelected: boolean; isDragged: boolean }
  >();

  for (const boat of boats) {
    const cells = getBoatCells(boat);
    const isSelected = boat.id === selectedBoatId;
    const isDragged = boat.id === draggedBoatId;
    for (const cell of cells) {
      boatCellsMap.set(`${cell.x}-${cell.y}`, {
        boatId: boat.id,
        isSelected,
        isDragged,
      });
    }
  }

  const previewSet = new Set(previewCells.map((p) => `${p.x}-${p.y}`));

  return (
    <GameGrid gridRef={gridRef}>
      {R.times(
        (y) =>
          R.times((x) => {
            const key = `${x}-${y}`;
            const boatCell = boatCellsMap.get(key);
            const isPreview = previewSet.has(key);
            const hasBoat = boatCell && !boatCell.isDragged;
            const isSelected = boatCell?.isSelected && !boatCell.isDragged;

            return (
              <GridCell
                key={key}
                hasBoat={hasBoat ?? false}
                isSelected={isReadonly ? false : (isSelected ?? false)}
                isValidPreview={
                  isReadonly ? false : isPreview && isPreviewValid
                }
                isInvalidPreview={
                  isReadonly ? false : isPreview && !isPreviewValid
                }
                onClick={isReadonly ? undefined : () => onCellClick(x, y)}
                onPointerDown={
                  isReadonly ? undefined : (e) => onCellPointerDown(x, y, e)
                }
                isReadonly={isReadonly}
              />
            );
          }, GRID_SIZE),
        GRID_SIZE,
      )}
    </GameGrid>
  );
}
