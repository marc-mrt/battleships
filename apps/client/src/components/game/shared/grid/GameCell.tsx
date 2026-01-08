import { tv, type VariantProps } from "tailwind-variants/lite";

const cellVariants = tv({
  base: "w-8 h-8 border transition-colors duration-100",
  variants: {
    variant: {
      empty: "bg-slate-800 border-slate-700",
      boat: "bg-cyan-600 border-cyan-500",
      boatSelected: "bg-cyan-500 border-cyan-300",
      hit: "bg-red-600 border-red-500",
      miss: "bg-slate-600 border-slate-500",
      sunk: "bg-red-800 border-red-600",
      validPreview: "bg-green-600/50 border-green-400",
      invalidPreview: "bg-red-600/50 border-red-400",
      targetable:
        "bg-slate-800 border-slate-700 hover:bg-cyan-700 hover:border-cyan-500",
    },
  },
  defaultVariants: {
    variant: "empty",
  },
});

type CellVariant = VariantProps<typeof cellVariants>["variant"];

interface GameCellProps {
  variant?: CellVariant;
  isButton?: boolean;
  onClick?: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  ariaLabel?: string;
}

export function GameCell({
  variant = "empty",
  isButton = false,
  onClick,
  onPointerDown,
  ariaLabel,
}: GameCellProps): JSX.Element {
  const className = cellVariants({ variant });

  if (isButton) {
    return (
      <button
        type="button"
        className={`${className} hover:brightness-110 active:brightness-90`}
        onClick={onClick}
        onPointerDown={onPointerDown}
        aria-label={ariaLabel}
      />
    );
  }

  return <div className={className} />;
}
