import type { ReactNode, RefObject } from "react";

interface GridWithLegendProps {
  children: ReactNode;
  gridRef?: RefObject<HTMLDivElement>;
  onPointerMove?: (event: React.PointerEvent) => void;
  className?: string;
}

const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const COLUMN_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function GridWithLegend({
  children,
  gridRef,
  onPointerMove,
  className = "",
}: GridWithLegendProps) {
  const gridClassName = `game-grid ${className}`.trim();

  return (
    <div className="grid-with-legend">
      <div className="grid-legend grid-legend-left" aria-hidden="true">
        {ROW_LABELS.map((label) => (
          <div key={label} className="grid-legend-label">
            {label}
          </div>
        ))}
      </div>

      <div className="grid-main-area">
        <div
          className={gridClassName}
          role="presentation"
          ref={gridRef}
          onPointerMove={onPointerMove}
        >
          {children}
        </div>

        <div className="grid-legend grid-legend-bottom" aria-hidden="true">
          {COLUMN_LABELS.map((label) => (
            <div key={label} className="grid-legend-label">
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
