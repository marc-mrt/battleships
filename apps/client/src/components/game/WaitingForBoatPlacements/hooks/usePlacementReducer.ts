import { BOATS_CONFIGURATION } from "game-rules";
import { useReducer } from "react";
import { canPlaceBoat, generateBoatId } from "../operations";
import type {
  Action,
  Boat,
  DragState,
  Orientation,
  PlacementState,
} from "../types";

function createInitialDragState(): DragState {
  return {
    isDragging: false,
    boatLength: 0,
    orientation: "horizontal",
    hoveredCell: null,
    offset: { x: 0, y: 0 },
    sourceBoatId: null,
  };
}

function createInitialState(): PlacementState {
  return {
    boats: [],
    stock: BOATS_CONFIGURATION.map((config) => ({
      length: config.length,
      count: config.count,
      placed: 0,
    })),
    drag: createInitialDragState(),
    selectedBoatId: null,
  };
}

function reducer(state: PlacementState, action: Action): PlacementState {
  switch (action.type) {
    case "START_DRAG_FROM_STOCK": {
      const stockItem = state.stock.find((s) => s.length === action.length);
      if (!stockItem || stockItem.placed >= stockItem.count) {
        return state;
      }
      return {
        ...state,
        drag: {
          isDragging: true,
          boatLength: action.length,
          orientation: "horizontal",
          hoveredCell: null,
          offset: { x: 0, y: 0 },
          sourceBoatId: null,
        },
        selectedBoatId: null,
      };
    }

    case "START_DRAG_FROM_GRID": {
      const boat = state.boats.find((b) => b.id === action.boatId);
      if (!boat) return state;
      return {
        ...state,
        drag: {
          isDragging: true,
          boatLength: boat.length,
          orientation: boat.orientation,
          hoveredCell: null,
          offset: action.offset,
          sourceBoatId: boat.id,
        },
        selectedBoatId: boat.id,
      };
    }

    case "SET_HOVERED_CELL": {
      if (
        state.drag.hoveredCell?.x === action.position?.x &&
        state.drag.hoveredCell?.y === action.position?.y
      ) {
        return state;
      }
      return {
        ...state,
        drag: { ...state.drag, hoveredCell: action.position },
      };
    }

    case "END_DRAG": {
      const { drag, boats, stock } = state;
      if (!drag.isDragging || !drag.hoveredCell) {
        return {
          ...state,
          drag: createInitialDragState(),
        };
      }

      const startX = drag.hoveredCell.x - drag.offset.x;
      const startY = drag.hoveredCell.y - drag.offset.y;

      const newBoat: Boat = {
        id: drag.sourceBoatId || generateBoatId(),
        startX,
        startY,
        length: drag.boatLength,
        orientation: drag.orientation,
      };

      if (
        !canPlaceBoat({
          boat: newBoat,
          boats,
          excludeBoatId: drag.sourceBoatId || undefined,
        })
      ) {
        return {
          ...state,
          drag: createInitialDragState(),
        };
      }

      if (drag.sourceBoatId) {
        const updatedBoats = boats.map((b) =>
          b.id === drag.sourceBoatId ? newBoat : b,
        );
        return {
          ...state,
          boats: updatedBoats,
          drag: createInitialDragState(),
          selectedBoatId: newBoat.id,
        };
      }

      const updatedStock = stock.map((s) =>
        s.length === drag.boatLength ? { ...s, placed: s.placed + 1 } : s,
      );

      return {
        ...state,
        boats: [...boats, newBoat],
        stock: updatedStock,
        drag: createInitialDragState(),
        selectedBoatId: newBoat.id,
      };
    }

    case "SELECT_BOAT": {
      return { ...state, selectedBoatId: action.boatId };
    }

    case "ROTATE_SELECTED": {
      if (!state.selectedBoatId) return state;
      const boat = state.boats.find((b) => b.id === state.selectedBoatId);
      if (!boat) return state;

      const newOrientation: Orientation =
        boat.orientation === "horizontal" ? "vertical" : "horizontal";

      const rotatedBoat: Boat = { ...boat, orientation: newOrientation };

      if (
        !canPlaceBoat({
          boat: rotatedBoat,
          boats: state.boats,
          excludeBoatId: boat.id,
        })
      ) {
        return state;
      }

      return {
        ...state,
        boats: state.boats.map((b) =>
          b.id === state.selectedBoatId ? rotatedBoat : b,
        ),
      };
    }

    case "DELETE_SELECTED": {
      if (!state.selectedBoatId) return state;
      const boat = state.boats.find((b) => b.id === state.selectedBoatId);
      if (!boat) return state;

      return {
        ...state,
        boats: state.boats.filter((b) => b.id !== state.selectedBoatId),
        stock: state.stock.map((s) =>
          s.length === boat.length ? { ...s, placed: s.placed - 1 } : s,
        ),
        selectedBoatId: null,
      };
    }

    default:
      return state;
  }
}

export function usePlacementReducer() {
  return useReducer(reducer, null, createInitialState);
}
