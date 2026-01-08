interface GridCellProps {
  hasBoat: boolean;
  isSelected: boolean;
  isValidPreview: boolean;
  isInvalidPreview: boolean;
  onClick?: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  isReadonly?: boolean;
}

export function GridCell(props: GridCellProps): JSX.Element {
  const {
    hasBoat,
    isSelected,
    isValidPreview,
    isInvalidPreview,
    onClick,
    onPointerDown,
    isReadonly = false,
  } = props;

  let bgClass = "bg-slate-800";
  let borderClass = "border-slate-700";

  if (hasBoat) {
    bgClass = isSelected ? "bg-cyan-500" : "bg-cyan-600";
    borderClass = isSelected ? "border-cyan-300" : "border-cyan-500";
  } else if (isValidPreview) {
    bgClass = "bg-green-600/50";
    borderClass = "border-green-400";
  } else if (isInvalidPreview) {
    bgClass = "bg-red-600/50";
    borderClass = "border-red-400";
  }

  const baseClasses = `w-8 h-8 border ${bgClass} ${borderClass} transition-colors duration-100`;

  if (isReadonly) {
    return <div className={baseClasses} />;
  }

  return (
    <button
      type="button"
      className={`${baseClasses} hover:brightness-110 active:brightness-90`}
      onClick={onClick}
      onPointerDown={onPointerDown}
    />
  );
}
