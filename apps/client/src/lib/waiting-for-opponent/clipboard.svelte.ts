export class ClipboardManager {
	private copied = $state(false);
	private timeoutId: number | null = null;

	get isCopied() {
		return this.copied;
	}

	private resetCopiedState(): void {
		this.copied = false;
	}

	private handleCopySuccess(): void {
		this.copied = true;
	}

	copy(text: string, duration: number = 1500): Promise<void> {
		return navigator.clipboard.writeText(text).then(this.handleTextWritten.bind(this, duration));
	}

	private handleTextWritten(duration: number): void {
		this.handleCopySuccess();

		if (this.timeoutId) clearTimeout(this.timeoutId);

		this.timeoutId = setTimeout(this.resetCopiedState.bind(this), duration);
	}

	cleanup(): void {
		if (this.timeoutId) clearTimeout(this.timeoutId);
	}
}
