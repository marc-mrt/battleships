import { GRID_SIZE } from "game-rules";
import * as GridOps from "../grid/operations";
import type { Boat, PlacementState, Position } from "../grid/types";
import * as PlacementOps from "./operations";

export class PlacementStateStore {
  private state = $state<PlacementState>(
    PlacementOps.createInitialPlacementState(GRID_SIZE),
  );
  private selected = $state<string | null>(null);

  get boats(): Boat[] {
    return this.state.boats;
  }

  get stock() {
    return this.state.stock;
  }

  get grid() {
    return this.state.grid;
  }

  get isComplete(): boolean {
    return PlacementOps.isPlacementComplete(this.state);
  }

  get selectedBoatId(): string | null {
    return this.selected;
  }

  addBoat(boat: Boat): boolean {
    const newState = PlacementOps.addBoat({ state: this.state, boat });
    if (newState === this.state) return false;
    this.state = newState;
    this.selected = boat.id;
    return true;
  }

  removeBoat(boatId: string): boolean {
    const newState = PlacementOps.removeBoat({ state: this.state, boatId });
    if (newState === this.state) return false;
    this.state = newState;
    if (this.selected === boatId) {
      this.selected = null;
    }
    return true;
  }

  moveBoat(
    boatId: string,
    startX: number,
    startY: number,
    orientation: "horizontal" | "vertical",
  ): boolean {
    const newState = PlacementOps.moveBoat({
      state: this.state,
      boatId,
      startX,
      startY,
      orientation,
    });
    if (newState === this.state) return false;
    this.state = newState;
    this.selected = boatId;
    return true;
  }

  rotateBoat(boatId: string): boolean {
    const newState = PlacementOps.rotateBoat({ state: this.state, boatId });
    if (newState === this.state) return false;
    this.state = newState;
    return true;
  }

  selectBoatAt(position: Position): void {
    const cell = GridOps.getCell(this.state.grid, position);
    this.selected = cell?.boatId || null;
  }

  clearSelection(): void {
    this.selected = null;
  }

  canPlaceBoat(boat: Boat): boolean {
    return PlacementOps.canPlaceBoat({ state: this.state, boat });
  }

  reset(): void {
    this.state = PlacementOps.createInitialPlacementState(GRID_SIZE);
    this.selected = null;
  }
}
