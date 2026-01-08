import * as R from "ramda";
import type { StockItem } from "../types";

interface BoatStockProps {
  stock: StockItem[];
  onPointerDown: (length: number, event: React.PointerEvent) => void;
}

export function BoatStock({
  stock,
  onPointerDown,
}: BoatStockProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5 w-full max-w-xs">
      <div className="flex flex-col gap-1">
        {stock.map((item) => {
          const isAvailable = item.placed < item.count;
          const remaining = item.count - item.placed;

          return (
            <div
              key={item.length}
              className={`flex items-center justify-between gap-2 p-1 rounded border transition-colors ${
                isAvailable
                  ? "border-cyan-600 bg-slate-800"
                  : "border-slate-700 bg-slate-900 opacity-50"
              }`}
            >
              <button
                type="button"
                disabled={!isAvailable}
                className={`flex gap-px touch-none ${
                  isAvailable
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-not-allowed"
                }`}
                onPointerDown={
                  isAvailable ? (e) => onPointerDown(item.length, e) : undefined
                }
              >
                {R.times(
                  (i) => (
                    <div
                      key={i}
                      className="w-5 h-5 bg-cyan-600 border border-cyan-500 rounded-sm"
                    />
                  ),
                  item.length,
                )}
              </button>
              <span className="text-xs font-medium text-slate-300">
                {remaining}/{item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
