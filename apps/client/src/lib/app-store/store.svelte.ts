import * as R from 'ramda';
import * as API from '../../api';
import type { ClientMessage, ServerMessage, GameState } from 'game-messages';
import type { SessionStatus } from '../../models/session';
import { getConnectionManager, type ConnectionManager } from './connection-manager.svelte';

export interface Metadata {
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
}

export type State =
	| { status: 'uninitialized' }
	| { status: 'loading' }
	| { status: 'ready'; meta: Metadata; game: GameState | null };

class AppStore {
	private unsubscribe: (() => void) | null = null;
	private state = $state<State>({ status: 'uninitialized' });

	get player() {
		return this.state.status === 'ready' ? this.state.meta.player : null;
	}

	get opponent() {
		return this.state.status === 'ready' ? this.state.meta.opponent : null;
	}

	get session() {
		return this.state.status === 'ready' ? this.state.meta.session : null;
	}

	get game() {
		return this.state.status === 'ready' ? this.state.game : null;
	}

	constructor(
		private connectionManager: ConnectionManager = getConnectionManager(),
		private api: typeof API = API,
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
				meta: {
					session: {
						slug: session.slug,
						status: session.status,
					},
					player: {
						id: session.owner.id,
						username: session.owner.username,
					},
					opponent: null,
				},
				game: null,
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
				meta: {
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
				},
				game: null,
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
				meta: {
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
				},
				game: null,
			};
		} catch (error) {
			console.error('Reconnection failed:', error);
		}
	}

	private handleIncomingMessage(message: ServerMessage): void {
		if (this.state.status !== 'ready') {
			console.warn('Received message before store was initialized');
			return;
		}

		switch (message.type) {
			case 'friend_joined':
				this.state = R.mergeDeepRight(this.state, {
					meta: {
						session: {
							status: message.data.session.status,
						},
						opponent: {
							id: message.data.friend.playerId,
							username: message.data.friend.username,
						},
					},
				});
				break;
			case 'next_turn':
				this.state = R.mergeDeepRight(this.state, {
					game: message.data,
					meta: {
						session: {
							status: message.data.session.status,
						},
					},
				});
				break;
			default:
				break;
		}
	}

	sendAction(action: ClientMessage) {
		this.connectionManager.send(action);
	}

	destroy() {
		this.connectionManager.disconnect();
	}
}

export const appStore: AppStore = new AppStore();
