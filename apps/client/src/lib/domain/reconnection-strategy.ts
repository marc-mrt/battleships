export interface ReconnectionStrategy {
	shouldRetry(attempts: number): boolean;
	getDelay(attempts: number): number;
	reset(): void;
}

export class ExponentialBackoffStrategy implements ReconnectionStrategy {
	constructor(
		private maxAttempts: number = 5,
		private baseDelay: number = 1000,
	) {}

	shouldRetry(attempts: number): boolean {
		return attempts < this.maxAttempts;
	}

	getDelay(attempts: number): number {
		return this.baseDelay * attempts;
	}

	reset(): void {}
}
