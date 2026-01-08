export type Orientation = "horizontal" | "vertical";

export interface Boat {
  id: string;
  startX: number;
  startY: number;
  length: number;
  orientation: Orientation;
}

export interface StockItem {
  length: number;
  count: number;
  placed: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  boatLength: number;
  orientation: Orientation;
  hoveredCell: Position | null;
  offset: Position;
  sourceBoatId: string | null;
}

export interface PlacementState {
  boats: Boat[];
  stock: StockItem[];
  drag: DragState;
  selectedBoatId: string | null;
}

export type Action =
  | { type: "START_DRAG_FROM_STOCK"; length: number }
  | { type: "START_DRAG_FROM_GRID"; boatId: string; offset: Position }
  | { type: "SET_HOVERED_CELL"; position: Position | null }
  | { type: "END_DRAG" }
  | { type: "SELECT_BOAT"; boatId: string | null }
  | { type: "ROTATE_SELECTED" }
  | { type: "DELETE_SELECTED" };
