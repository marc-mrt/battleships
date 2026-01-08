interface GridCellProps {
  x: number;
  y: number;
  classNames: string[];
  onClick?: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  disabled?: boolean;
  ariaLabel?: string;
  isButton?: boolean;
}

export function GridCell({
  x,
  y,
  classNames,
  onClick,
  onPointerDown,
  disabled = false,
  ariaLabel,
  isButton = false,
}: GridCellProps) {
  const baseClass = "grid-cell";
  const className = [baseClass, ...classNames].filter(Boolean).join(" ");
  const key = `cell-${x}-${y}`;

  if (isButton) {
    return (
      <button
        key={key}
        type="button"
        className={className}
        disabled={disabled}
        onClick={onClick}
        onPointerDown={(e) => onPointerDown?.(e)}
        aria-label={ariaLabel}
      />
    );
  }

  return <div key={key} className={className} />;
}
