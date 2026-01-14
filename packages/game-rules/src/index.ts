export const GRID_SIZE = 9;

export const BOATS_CONFIGURATION = [
  { length: 5, count: 1 },
  { length: 4, count: 1 },
  { length: 3, count: 2 },
  { length: 2, count: 1 },
] as const;

export const TOTAL_BOATS_COUNT = BOATS_CONFIGURATION.reduce(
  (acc, boat) => acc + boat.count,
  0,
);

export const MIN_BOAT_LENGTH = BOATS_CONFIGURATION.reduce(
  (min, boat) => Math.min(min, boat.length),
  Infinity,
);

export const MAX_BOAT_LENGTH = BOATS_CONFIGURATION.reduce(
  (max, boat) => Math.max(max, boat.length),
  0,
);
