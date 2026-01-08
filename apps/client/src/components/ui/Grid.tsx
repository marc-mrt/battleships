import type { ReactNode } from "react";

interface GridProps {
  children: ReactNode;
  gridRef?: React.RefObject<HTMLDivElement>;
  onPointerMove?: (event: React.PointerEvent) => void;
  className?: string;
}

export function Grid({
  children,
  gridRef,
  onPointerMove,
  className = "",
}: GridProps) {
  const gridClassName = `grid ${className}`.trim();

  return (
    <div
      className={gridClassName}
      role="presentation"
      ref={gridRef}
      onPointerMove={onPointerMove}
    >
      {children}
    </div>
  );
}
