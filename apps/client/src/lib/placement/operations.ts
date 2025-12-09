import { BOATS_CONFIGURATION } from "game-rules";
import * as R from "ramda";
import {
  createEmptyGrid,
  getBoatCells,
  getCell,
  isValidPosition,
  setCells,
} from "../grid/operations";
import type { Boat, PlacementState } from "../grid/types";

interface UpdateStockItemPayload {
  stockItem: { length: number; count: number; placed: number };
  length: number;
  delta: number;
}

function updateStockItem(payload: UpdateStockItemPayload): {
  length: number;
  count: number;
  placed: number;
} {
  if (payload.stockItem.length === payload.length) {
    return {
      ...payload.stockItem,
      placed: payload.stockItem.placed + payload.delta,
    };
  }
  return payload.stockItem;
}

function updateStockPlaced(length: number, delta: number) {
  return function updateStock(stockItem: {
    length: number;
    count: number;
    placed: number;
  }) {
    return updateStockItem({ stockItem, length, delta });
  };
}

function updateStockCount(length: number, delta: number) {
  return R.map(updateStockPlaced(length, delta));
}

function addPlacedCount(config: { length: number; count: number }) {
  return { ...config, placed: 0 };
}

export function createInitialPlacementState(size: number): PlacementState {
  return {
    grid: createEmptyGrid(size),
    boats: [],
    stock: BOATS_CONFIGURATION.map(addPlacedCount),
  };
}

interface IsCellAvailableForBoatPayload {
  state: PlacementState;
  pos: { x: number; y: number };
  excludeBoatId?: string;
}

function isCellAvailableForBoat(
  payload: IsCellAvailableForBoatPayload,
): boolean {
  if (!isValidPosition(payload.pos, payload.state.grid.size)) {
    return false;
  }
  const cell = getCell(payload.state.grid, payload.pos);
  if (!cell) {
    return false;
  }
  if (!cell.occupied) {
    return true;
  }
  return cell.boatId === payload.excludeBoatId;
}

function checkCellAvailability(state: PlacementState, excludeBoatId?: string) {
  return function checkCell(pos: { x: number; y: number }): boolean {
    return isCellAvailableForBoat({ state, pos, excludeBoatId });
  };
}

interface CanPlaceBoatPayload {
  state: PlacementState;
  boat: Boat;
  excludeBoatId?: string;
}

export function canPlaceBoat(payload: CanPlaceBoatPayload): boolean {
  const cells = getBoatCells(payload.boat);
  return cells.every(
    checkCellAvailability(payload.state, payload.excludeBoatId),
  );
}

function hasLength(length: number) {
  return function matchLength(s: { length: number }): boolean {
    return s.length === length;
  };
}

function findStockItem(state: PlacementState, length: number) {
  return state.stock.find(hasLength(length));
}

function isStockAvailable(
  stockItem: { placed: number; count: number } | undefined,
): boolean {
  return stockItem !== undefined && stockItem.placed < stockItem.count;
}

function createOccupiedCell(boatId: string) {
  return { occupied: true, boatId };
}

function createEmptyCell() {
  return { occupied: false, boatId: null };
}

function createCellUpdate(pos: { x: number; y: number }, boatId: string) {
  return { pos, cell: createOccupiedCell(boatId) };
}

function createClearUpdate(pos: { x: number; y: number }) {
  return { pos, cell: createEmptyCell() };
}

function createBoatCellUpdate(pos: { x: number; y: number }, boatId: string) {
  return createCellUpdate(pos, boatId);
}

function createUpdateForBoat(boatId: string) {
  return function createUpdate(pos: { x: number; y: number }) {
    return createBoatCellUpdate(pos, boatId);
  };
}

interface AddBoatPayload {
  state: PlacementState;
  boat: Boat;
}

export function addBoat(payload: AddBoatPayload): PlacementState {
  const { state, boat } = payload;
  const stockItem = findStockItem(state, boat.length);
  if (!isStockAvailable(stockItem)) {
    return state;
  }
  if (!canPlaceBoat({ state, boat })) {
    return state;
  }

  const cells = getBoatCells(boat);
  const updates = R.map(createUpdateForBoat(boat.id), cells);

  return {
    ...state,
    grid: setCells(state.grid, updates),
    boats: [...state.boats, boat],
    stock: updateStockCount(boat.length, 1)(state.stock),
  };
}

function hasBoatId(boatId: string) {
  return function matchesId(b: Boat): boolean {
    return b.id === boatId;
  };
}

function isNotBoatId(boatId: string) {
  return function doesNotMatch(b: Boat): boolean {
    return b.id !== boatId;
  };
}

function findBoat(state: PlacementState, boatId: string): Boat | undefined {
  return state.boats.find(hasBoatId(boatId));
}

function removeBoatFromList(boats: Boat[], boatId: string): Boat[] {
  return boats.filter(isNotBoatId(boatId));
}

interface RemoveBoatPayload {
  state: PlacementState;
  boatId: string;
}

export function removeBoat(payload: RemoveBoatPayload): PlacementState {
  const { state, boatId } = payload;
  const boat = findBoat(state, boatId);
  if (!boat) {
    return state;
  }

  const cells = getBoatCells(boat);
  const updates = R.map(createClearUpdate, cells);

  return {
    ...state,
    grid: setCells(state.grid, updates),
    boats: removeBoatFromList(state.boats, boatId),
    stock: updateStockCount(boat.length, -1)(state.stock),
  };
}

interface CreateUpdatedBoatPayload {
  boat: Boat;
  startX: number;
  startY: number;
  orientation: "horizontal" | "vertical";
}

function createUpdatedBoat(payload: CreateUpdatedBoatPayload): Boat {
  return {
    ...payload.boat,
    startX: payload.startX,
    startY: payload.startY,
    orientation: payload.orientation,
  };
}

function replaceIfMatches(boatId: string, updatedBoat: Boat) {
  return function replace(b: Boat): Boat {
    return b.id === boatId ? updatedBoat : b;
  };
}

interface ReplaceBoatPayload {
  boats: Boat[];
  boatId: string;
  updatedBoat: Boat;
}

function replaceBoat(payload: ReplaceBoatPayload): Boat[] {
  return payload.boats.map(
    replaceIfMatches(payload.boatId, payload.updatedBoat),
  );
}

interface MoveBoatPayload {
  state: PlacementState;
  boatId: string;
  startX: number;
  startY: number;
  orientation: "horizontal" | "vertical";
}

export function moveBoat(payload: MoveBoatPayload): PlacementState {
  const { state, boatId, startX, startY, orientation } = payload;
  const boat = findBoat(state, boatId);
  if (!boat) {
    return state;
  }

  const updatedBoat = createUpdatedBoat({ boat, startX, startY, orientation });
  if (!canPlaceBoat({ state, boat: updatedBoat, excludeBoatId: boatId })) {
    return state;
  }

  const oldCells = getBoatCells(boat);
  const removeUpdates = R.map(createClearUpdate, oldCells);

  const newCells = getBoatCells(updatedBoat);
  const addUpdates = R.map(createUpdateForBoat(boat.id), newCells);

  return {
    ...state,
    grid: setCells(setCells(state.grid, removeUpdates), addUpdates),
    boats: replaceBoat({ boats: state.boats, boatId, updatedBoat }),
  };
}

function toggleBoatOrientation(
  orientation: "horizontal" | "vertical",
): "horizontal" | "vertical" {
  return orientation === "horizontal" ? "vertical" : "horizontal";
}

interface RotateBoatPayload {
  state: PlacementState;
  boatId: string;
}

export function rotateBoat(payload: RotateBoatPayload): PlacementState {
  const { state, boatId } = payload;
  const boat = findBoat(state, boatId);
  if (!boat) {
    return state;
  }

  const newOrientation = toggleBoatOrientation(boat.orientation);
  return moveBoat({
    state,
    boatId,
    startX: boat.startX,
    startY: boat.startY,
    orientation: newOrientation,
  });
}

function isStockComplete(stockItem: {
  placed: number;
  count: number;
}): boolean {
  return stockItem.placed === stockItem.count;
}

export function isPlacementComplete(state: PlacementState): boolean {
  return state.stock.every(isStockComplete);
}
