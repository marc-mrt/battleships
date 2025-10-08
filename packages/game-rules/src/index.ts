export const GRID_SIZE = 9;

export const BOATS_CONFIGURATION = [
  { length: 5, count: 1 },
  { length: 4, count: 1 },
  { length: 3, count: 2 },
  { length: 2, count: 1 },
] as const;

export const TOTAL_BOATS = BOATS_CONFIGURATION.reduce(
  (acc, boat) => acc + boat.count,
  0,
);
