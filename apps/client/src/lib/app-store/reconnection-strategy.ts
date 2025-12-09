const DEFAULT_MAX_RECONNECTION_ATTEMPTS = 5;
const DEFAULT_RECONNECTION_BASE_DELAY_MS = 1000;

interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
}

export interface ReconnectionStrategy {
  shouldReconnect: () => boolean;
  getDelay: () => number;
  reset: () => void;
  incrementAttempts: () => void;
}

function createExponentialBackoff(
  config: ReconnectionConfig,
): ReconnectionStrategy {
  let attempts = 0;

  function shouldReconnect(): boolean {
    return attempts < config.maxAttempts;
  }

  function getDelay(): number {
    return config.baseDelay * (attempts + 1);
  }

  function reset(): void {
    attempts = 0;
  }

  function incrementAttempts(): void {
    attempts++;
  }

  return {
    shouldReconnect,
    getDelay,
    reset,
    incrementAttempts,
  };
}

interface CreateReconnectionStrategyPayload {
  maxAttempts?: number;
  baseDelay?: number;
}

export function createReconnectionStrategy(
  payload: CreateReconnectionStrategyPayload = {},
): ReconnectionStrategy {
  const maxAttempts = payload.maxAttempts ?? DEFAULT_MAX_RECONNECTION_ATTEMPTS;
  const baseDelay = payload.baseDelay ?? DEFAULT_RECONNECTION_BASE_DELAY_MS;
  return createExponentialBackoff({ maxAttempts, baseDelay });
}
