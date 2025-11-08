export class ClipboardManager {
	private copied = $state(false);
	private timeoutId: number | null = null;

	get isCopied() {
		return this.copied;
	}

	copy(text: string, duration: number = 1500): Promise<void> {
		return navigator.clipboard.writeText(text).then(() => {
			this.copied = true;

			if (this.timeoutId) clearTimeout(this.timeoutId);

			this.timeoutId = setTimeout(() => {
				this.copied = false;
			}, duration);
		});
	}

	cleanup(): void {
		if (this.timeoutId) clearTimeout(this.timeoutId);
	}
}
