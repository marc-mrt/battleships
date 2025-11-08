type AnimationState =
	| { type: 'idle' }
	| { type: 'shooting'; x: number; y: number }
	| { type: 'hit'; x: number; y: number }
	| { type: 'miss'; x: number; y: number }
	| { type: 'sunk'; x: number; y: number };

type SoundType = 'shoot' | 'hit' | 'miss' | 'sunk';

const ANIMATION_DELAYS = {
	shoot: 300,
	hit: 800,
	miss: 600,
	sunk: 1200,
};

class EffectManager {
	state = $state<AnimationState>({ type: 'idle' });
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private sounds: Map<SoundType, HTMLAudioElement> = new Map();
	private soundEnabled = $state(true);

	constructor() {
		this.initializeSounds();
	}

	private initializeSounds() {
		const soundFiles: Record<SoundType, string> = {
			shoot: '/sounds/shoot.mp3',
			hit: '/sounds/explosion.mp3',
			miss: '/sounds/splash.mp3',
			sunk: '/sounds/sinking.mp3',
		};

		Object.entries(soundFiles).forEach(([type, path]) => {
			const audio = new Audio(path);
			audio.preload = 'auto';
			this.sounds.set(type as SoundType, audio);
		});
	}

	private playSound(type: SoundType) {
		if (!this.soundEnabled) return;

		const sound = this.sounds.get(type);
		if (sound) {
			sound.currentTime = 0;
			sound.play().catch((error) => {
				console.warn(`Failed to play ${type} sound:`, error);
			});
		}
	}

	async playShootingSequence(
		x: number,
		y: number,
		result: 'hit' | 'miss',
		sunk: boolean,
	): Promise<void> {
		this.state = { type: 'shooting', x, y };
		this.playSound('shoot');
		await this.delay(ANIMATION_DELAYS.shoot);

		if (sunk) {
			this.state = { type: 'sunk', x, y };
			this.playSound('sunk');
			await this.delay(ANIMATION_DELAYS.sunk);
		} else if (result === 'hit') {
			this.state = { type: 'hit', x, y };
			this.playSound('hit');
			await this.delay(ANIMATION_DELAYS.hit);
		} else {
			this.state = { type: 'miss', x, y };
			this.playSound('miss');
			await this.delay(ANIMATION_DELAYS.miss);
		}

		this.state = { type: 'idle' };
	}

	async playReceivingSequence(
		x: number,
		y: number,
		result: 'hit' | 'miss',
		sunk: boolean,
	): Promise<void> {
		if (sunk) {
			this.state = { type: 'sunk', x, y };
			this.playSound('sunk');
			await this.delay(ANIMATION_DELAYS.sunk);
		} else if (result === 'hit') {
			this.state = { type: 'hit', x, y };
			this.playSound('hit');
			await this.delay(ANIMATION_DELAYS.hit);
		} else {
			this.state = { type: 'miss', x, y };
			this.playSound('miss');
			await this.delay(ANIMATION_DELAYS.miss);
		}

		this.state = { type: 'idle' };
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => {
			this.timeoutId = setTimeout(resolve, ms);
		});
	}

	reset() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.state = { type: 'idle' };
	}

	isAnimating(): boolean {
		return this.state.type !== 'idle';
	}

	toggleSound() {
		this.soundEnabled = !this.soundEnabled;
	}

	setSoundEnabled(enabled: boolean) {
		this.soundEnabled = enabled;
	}
}

export function createEffectManager(): EffectManager {
	return new EffectManager();
}
