import { GRID_SIZE } from "game-rules";
import type { ReactNode, RefObject } from "react";

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const COLUMN_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface GameGridProps {
  children: ReactNode;
  gridRef?: RefObject<HTMLDivElement | null>;
}

export function GameGrid({ children, gridRef }: GameGridProps): JSX.Element {
  return (
    <div className="flex gap-1">
      <div className="flex flex-col justify-center gap-0">
        {ROW_LABELS.map((label) => (
          <div
            key={label}
            className="h-8 w-6 flex items-center justify-center text-xs text-slate-500"
          >
            {label}
          </div>
        ))}
        <div className="h-8 w-6 flex items-center justify-center text-xs text-slate-500" />
      </div>
      <div className="flex flex-col gap-0">
        <div
          ref={gridRef as React.RefObject<HTMLDivElement>}
          className="grid touch-none select-none"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}
        >
          {children}
        </div>
        <div className="flex gap-0">
          {COLUMN_LABELS.map((label) => (
            <div
              key={label}
              className="h-6 w-8 flex items-center justify-center text-xs text-slate-500"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
