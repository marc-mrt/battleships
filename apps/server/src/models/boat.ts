export interface Boat {
  id: string;
  startX: number;
  startY: number;
  length: number;
  orientation: "horizontal" | "vertical";
  sunk: boolean;
}
