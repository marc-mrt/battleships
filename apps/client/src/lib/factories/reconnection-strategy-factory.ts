export class ExponentialBackoffStrategyFactory {
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
