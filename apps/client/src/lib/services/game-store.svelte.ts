import * as API from '../api';
import type { ClientMessage, ServerMessage } from 'game-messages';
import type { GameState } from 'game-messages';
import type { SessionStatus } from '../models/session';
import { getConnectionManager, type ConnectionManager } from './connection-manager.svelte';
import { GameMessageHandler } from '../domain/game-message-handler';

export interface StoreData {
	session: {
		slug: string;
		status: SessionStatus;
	};
	player: {
		id: string;
		username: string;
	};
	opponent: {
		id: string;
		username: string;
	} | null;
	game: GameState | null;
}

type StoreState =
	| { status: 'uninitialized' }
	| { status: 'loading' }
	| { status: 'ready'; data: StoreData };

class GameStore {
	private unsubscribe: (() => void) | null = null;

	state = $state<StoreState>({ status: 'uninitialized' });

	get isReady(): boolean {
		return this.state.status === 'ready';
	}

	get data(): StoreData | null {
		return this.state.status === 'ready' ? this.state.data : null;
	}

	get player() {
		return this.data?.player ?? null;
	}

	get opponent() {
		return this.data?.opponent ?? null;
	}

	get session() {
		return this.data?.session ?? null;
	}

	get game() {
		return this.data?.game ?? null;
	}

	constructor(
		private connectionManager: ConnectionManager = getConnectionManager(),
		private api: typeof API = API,
		private messageHandler: GameMessageHandler = new GameMessageHandler(),
	) {
		this.unsubscribe = this.connectionManager.onMessage(this.handleIncomingMessage.bind(this));
	}

	public async createSession(payload: { username: string }) {
		const { username } = payload;

		this.state = { status: 'loading' };

		try {
			const session = await this.api.createSession({ username });
			await this.connectionManager.connect();

			this.state = {
				status: 'ready',
				data: {
					session: {
						slug: session.slug,
						status: session.status,
					},
					player: {
						id: session.owner.id,
						username: session.owner.username,
					},
					opponent: null,
					game: null,
				},
			};
		} catch (error) {
			this.state = { status: 'uninitialized' };
			throw error;
		}
	}

	public async joinSession(payload: { username: string; slug: string }) {
		const { username, slug } = payload;

		this.state = { status: 'loading' };

		try {
			const session = await this.api.joinSession({ username, slug });
			const player = session.friend;

			if (!player) {
				throw new Error('Failed to find player in session');
			}

			await this.connectionManager.connect();

			this.state = {
				status: 'ready',
				data: {
					session: {
						slug: session.slug,
						status: session.status,
					},
					player: {
						id: player.id,
						username: player.username,
					},
					opponent: {
						id: session.owner.id,
						username: session.owner.username,
					},
					game: null,
				},
			};
		} catch (error) {
			this.state = { status: 'uninitialized' };
			throw error;
		}
	}

	public async attemptReconnect() {
		try {
			const session = await this.api.getSession();
			if (session == null) {
				return;
			}

			await this.connectionManager.connect();

			this.state = {
				status: 'ready',
				data: {
					session: {
						slug: session.slug,
						status: session.status,
					},
					player: {
						id: session.owner.id,
						username: session.owner.username,
					},
					opponent: session.friend
						? {
								id: session.friend.id,
								username: session.friend.username,
							}
						: null,
					game: null,
				},
			};
		} catch (error) {
			console.error('Reconnection failed:', error);
		}
	}

	private updateStateData(updater: (data: StoreData) => StoreData): void {
		if (this.state.status !== 'ready') {
			console.warn('Cannot update state when not ready');
			return;
		}
		this.state = {
			status: 'ready',
			data: updater(this.state.data),
		};
	}

	private handleIncomingMessage(message: ServerMessage): void {
		if (this.state.status !== 'ready') {
			console.warn('Received message before store was initialized');
			return;
		}

		const newData = this.messageHandler.handleMessage(message, this.state.data);
		if (newData) {
			this.state = {
				status: 'ready',
				data: newData,
			};
		}
	}

	sendAction(action: ClientMessage) {
		this.connectionManager.send(action);
	}

	destroy() {
		this.unsubscribe?.();
		this.connectionManager.disconnect();
	}
}

export const gameStore: GameStore = new GameStore();
