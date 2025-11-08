export class ExponentialBackoffStrategyFactory {
	private attempts: number = 0;

	constructor(
		private maxAttempts: number = 5,
		private baseDelay: number = 1000,
	) {}

	shouldRetry(): boolean {
		return this.attempts < this.maxAttempts;
	}

	computeDelay(): number {
		return this.baseDelay * ++this.attempts;
	}

	reset(): void {
		this.attempts = 0;
	}
}
