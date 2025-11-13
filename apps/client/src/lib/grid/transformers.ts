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

interface MatchesPositionPayload {
	target: Position;
	current: Position;
}

function matchesPosition(payload: MatchesPositionPayload): boolean {
	return payload.target.x === payload.current.x && payload.target.y === payload.current.y;
}

interface TransformCellPayload {
	cell: CellState;
	x: number;
	y: number;
	predicate: (pos: Position) => boolean;
	transform: (cell: CellState) => CellState;
}

function transformCell(payload: TransformCellPayload): CellState {
	return payload.predicate({ x: payload.x, y: payload.y })
		? payload.transform(payload.cell)
		: payload.cell;
}

interface CreateCellTransformerPayload {
	y: number;
	predicate: (pos: Position) => boolean;
	transform: (cell: CellState) => CellState;
}

function createCellTransformer(payload: CreateCellTransformerPayload) {
	return function transformCellAt(cell: CellState, x: number): CellState {
		return transformCell({
			cell,
			x,
			y: payload.y,
			predicate: payload.predicate,
			transform: payload.transform,
		});
	};
}

interface TransformRowPayload {
	row: CellState[];
	y: number;
	predicate: (pos: Position) => boolean;
	transform: (cell: CellState) => CellState;
}

function transformRow(payload: TransformRowPayload): CellState[] {
	return payload.row.map(
		createCellTransformer({
			y: payload.y,
			predicate: payload.predicate,
			transform: payload.transform,
		}),
	);
}

interface CreateRowTransformerPayload {
	predicate: (pos: Position) => boolean;
	transform: (cell: CellState) => CellState;
}

function createRowTransformer(payload: CreateRowTransformerPayload) {
	return function transformRowAt(row: CellState[], y: number): CellState[] {
		return transformRow({ row, y, predicate: payload.predicate, transform: payload.transform });
	};
}

interface MapCellPayload {
	predicate: (pos: Position) => boolean;
	transform: (cell: CellState) => CellState;
}

export function mapCell(payload: MapCellPayload): GridTransformer {
	return function transformGrid(cells: CellState[][]): CellState[][] {
		return cells.map(
			createRowTransformer({ predicate: payload.predicate, transform: payload.transform }),
		);
	};
}

interface MergeCellPayload {
	cell: CellState;
	value: Partial<CellState>;
}

function mergeCell(payload: MergeCellPayload): CellState {
	return { ...payload.cell, ...payload.value };
}

function createMergeCellTransform(value: Partial<CellState>) {
	return function mergeCellValue(cell: CellState): CellState {
		return mergeCell({ cell, value });
	};
}

function createPositionMatcher(target: Position) {
	return function matchPosition(p: Position): boolean {
		return matchesPosition({ target, current: p });
	};
}

interface SetCellAtPayload {
	pos: Position;
	value: Partial<CellState>;
}

export function setCellAt(payload: SetCellAtPayload): GridTransformer {
	return mapCell({
		predicate: createPositionMatcher(payload.pos),
		transform: createMergeCellTransform(payload.value),
	});
}

interface IsPositionInListPayload {
	positions: Position[];
	target: Position;
}

function isPositionInList(payload: IsPositionInListPayload): boolean {
	return payload.positions.some(createPositionMatcher(payload.target));
}

function createPositionListMatcher(positions: Position[]) {
	return function isInList(p: Position): boolean {
		return isPositionInList({ positions, target: p });
	};
}

interface SetCellsAtPayload {
	positions: Position[];
	value: Partial<CellState>;
}

export function setCellsAt(payload: SetCellsAtPayload): GridTransformer {
	return mapCell({
		predicate: createPositionListMatcher(payload.positions),
		transform: createMergeCellTransform(payload.value),
	});
}

interface UpdateCellAtPayload {
	pos: Position;
	updater: (cell: CellState) => CellState;
}

export function updateCellAt(payload: UpdateCellAtPayload): GridTransformer {
	return mapCell({ predicate: createPositionMatcher(payload.pos), transform: payload.updater });
}

export function markBoat(positions: Position[]): GridTransformer {
	return setCellsAt({ positions, value: { boat: true } });
}

interface MarkShotPayload {
	pos: Position;
	hit: boolean;
}

export function markShot(payload: MarkShotPayload): GridTransformer {
	return setCellAt({
		pos: payload.pos,
		value: { shot: true, hit: payload.hit, miss: !payload.hit },
	});
}

export function markSunk(positions: Position[]): GridTransformer {
	return setCellsAt({ positions, value: { sunk: true } });
}

export function markSelected(positions: Position[]): GridTransformer {
	return setCellsAt({ positions, value: { selected: true } });
}

interface MarkPreviewPayload {
	positions: Position[];
	valid: boolean;
}

export function markPreview(payload: MarkPreviewPayload): GridTransformer {
	return setCellsAt({
		positions: payload.positions,
		value: {
			preview: true,
			validDrop: payload.valid,
			invalidDrop: !payload.valid,
		},
	});
}
