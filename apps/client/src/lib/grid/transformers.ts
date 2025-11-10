import * as R from 'ramda';
import type { CellState, Position } from './types';

export type GridTransformer = (cells: CellState[][]) => CellState[][];

export const identity: GridTransformer = R.identity;

function applyTransformer(
	accumulated: GridTransformer,
	transformer: GridTransformer,
): GridTransformer {
	return function transform(cells: CellState[][]): CellState[][] {
		return transformer(accumulated(cells));
	};
}

export function compose(...transformers: GridTransformer[]): GridTransformer {
	return transformers.reduce(applyTransformer, identity);
}

function matchesPosition(target: Position, current: Position): boolean {
	return target.x === current.x && target.y === current.y;
}

function transformCell(
	cell: CellState,
	x: number,
	y: number,
	predicate: (pos: Position) => boolean,
	transform: (cell: CellState) => CellState,
): CellState {
	return predicate({ x, y }) ? transform(cell) : cell;
}

function createCellTransformer(
	y: number,
	predicate: (pos: Position) => boolean,
	transform: (cell: CellState) => CellState,
) {
	return function transformCellAt(cell: CellState, x: number): CellState {
		return transformCell(cell, x, y, predicate, transform);
	};
}

function transformRow(
	row: CellState[],
	y: number,
	predicate: (pos: Position) => boolean,
	transform: (cell: CellState) => CellState,
): CellState[] {
	return row.map(createCellTransformer(y, predicate, transform));
}

function createRowTransformer(
	predicate: (pos: Position) => boolean,
	transform: (cell: CellState) => CellState,
) {
	return function transformRowAt(row: CellState[], y: number): CellState[] {
		return transformRow(row, y, predicate, transform);
	};
}

export function mapCell(
	predicate: (pos: Position) => boolean,
	transform: (cell: CellState) => CellState,
): GridTransformer {
	return function transformGrid(cells: CellState[][]): CellState[][] {
		return cells.map(createRowTransformer(predicate, transform));
	};
}

function mergeCell(cell: CellState, value: Partial<CellState>): CellState {
	return { ...cell, ...value };
}

function createMergeCellTransform(value: Partial<CellState>) {
	return function mergeCellValue(cell: CellState): CellState {
		return mergeCell(cell, value);
	};
}

function createPositionMatcher(target: Position) {
	return function matchPosition(p: Position): boolean {
		return matchesPosition(target, p);
	};
}

export function setCellAt(pos: Position, value: Partial<CellState>): GridTransformer {
	return mapCell(createPositionMatcher(pos), createMergeCellTransform(value));
}

function isPositionInList(positions: Position[], target: Position): boolean {
	return positions.some(createPositionMatcher(target));
}

function createPositionListMatcher(positions: Position[]) {
	return function isInList(p: Position): boolean {
		return isPositionInList(positions, p);
	};
}

export function setCellsAt(positions: Position[], value: Partial<CellState>): GridTransformer {
	return mapCell(createPositionListMatcher(positions), createMergeCellTransform(value));
}

export function updateCellAt(
	pos: Position,
	updater: (cell: CellState) => CellState,
): GridTransformer {
	return mapCell(createPositionMatcher(pos), updater);
}

export function markBoat(positions: Position[]): GridTransformer {
	return setCellsAt(positions, { boat: true });
}

export function markShot(pos: Position, hit: boolean): GridTransformer {
	return setCellAt(pos, { shot: true, hit, miss: !hit });
}

export function markSunk(positions: Position[]): GridTransformer {
	return setCellsAt(positions, { sunk: true });
}

export function markSelected(positions: Position[]): GridTransformer {
	return setCellsAt(positions, { selected: true });
}

export function markPreview(positions: Position[], valid: boolean): GridTransformer {
	return setCellsAt(positions, {
		preview: true,
		validDrop: valid,
		invalidDrop: !valid,
	});
}
