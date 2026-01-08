import * as R from "ramda";
import type { Orientation } from "../types";

interface FloatingBoatProps {
  length: number;
  orientation: Orientation;
  x: number;
  y: number;
}

export function FloatingBoat({
  length,
  orientation,
  x,
  y,
}: FloatingBoatProps): JSX.Element {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={`fixed pointer-events-none z-50 flex ${isHorizontal ? "flex-row" : "flex-col"} gap-0.5`}
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {R.times(
        (i) => (
          <div
            key={i}
            className="w-6 h-6 bg-cyan-500 border border-cyan-300 rounded-sm opacity-80 shadow-lg"
          />
        ),
        length,
      )}
    </div>
  );
}
