import { writable } from 'svelte/store';
import * as R from 'ramda';
import * as API from '../api';
import {
	type ClientMessage,
	type FriendJoinedMessage,
	type GameState,
	type NextTurnMessage,
	type ServerMessage,
} from 'game-messages';
import type { SessionStatus } from '../models/session';

import { getWebsocketManager } from './websocket-manager.svelte';

export interface Store {
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

class GameStoreSvelte {
	public store = writable<Store | null>(null);
	public webSocket = getWebsocketManager();
	private readonly unsubscribe: (() => void) | null = null;

	constructor() {
		this.unsubscribe = this.webSocket.onMessage(this.handleIncomingMessage.bind(this));
	}

	public async createSession(payload: { username: string }) {
		const { username } = payload;

		const session = await API.createSession({ username });
		await this.webSocket.connect();

		this.store.set({
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
		});
	}

	public async joinSession(payload: { username: string; slug: string }) {
		const { username, slug } = payload;

		const session = await API.joinSession({ username, slug });
		const player = session.friend;

		if (!player) {
			throw new Error('Failed to find player in session');
		}

		await this.webSocket.connect();

		this.store.set({
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
		});
	}

	public async attemptReconnect() {
		const session = await API.getSession();
		if (session == null) {
			return;
		}

		await this.webSocket.connect();

		this.store.set({
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
		});
	}

	private handleIncomingMessage(message: ServerMessage): void {
		switch (message.type) {
			case 'friend_joined':
				return this.handleFriendJoinedMessage(message);
			case 'next_turn':
				return this.handleNextTurn(message);
			default:
				break;
		}
	}

	private handleFriendJoinedMessage(message: FriendJoinedMessage): void {
		this.store.update((state): Store | null => {
			if (state == null) {
				console.warn('Received friend joined message before player store was initialized');
				return null;
			}

			return R.mergeDeepRight(state, {
				opponent: {
					id: message.data.friend.playerId,
					username: message.data.friend.username,
				},
				session: { status: message.data.session.status },
			});
		});
	}

	private handleNextTurn(message: NextTurnMessage): void {
		this.store.update((state): Store | null => {
			if (state == null) {
				console.warn('Received game-started message before player store was initialized');
				return null;
			}

			return R.mergeDeepRight(state, {
				session: { status: message.data.session.status },
				game: message.data,
			});
		});
	}

	sendAction(action: ClientMessage) {
		this.webSocket.send(action);
	}

	destroy() {
		this.unsubscribe?.();
	}
}

export const gameStore = new GameStoreSvelte();
