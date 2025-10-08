import { writable } from 'svelte/store';
import * as R from 'ramda';
import * as API from '../api';
import {
	type ClientMessage,
	type FriendJoinedMessage,
	type ReadyToPlayMessage,
	type ServerMessage,
} from 'game-messages';
import type { SessionStatus } from '../models/session';

import { getWebsocketManager } from './websocket-manager.svelte';

export interface Store {
	session: {
		id: string;
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
		await this.webSocket.connect(session.owner.id);

		this.store.set({
			session: {
				id: session.id,
				status: session.status,
			},
			player: {
				id: session.owner.id,
				username: session.owner.username,
			},
			opponent: null,
		});
	}

	public async joinSession(payload: { username: string; sessionId: string }) {
		const { username, sessionId } = payload;

		const session = await API.joinSession({ username, sessionId });
		const player = session.friend;

		if (!player) {
			throw new Error('Failed to find player in session');
		}

		await this.webSocket.connect(player.id);

		this.store.set({
			session: {
				id: session.id,
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
		});
	}

	private handleIncomingMessage(message: ServerMessage): void {
		switch (message.type) {
			case 'friend-joined':
				return this.handleFriendJoinedMessage(message);
			case 'ready-to-play':
				return this.handleReadyToPlayMessage(message);
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

	private handleReadyToPlayMessage(message: ReadyToPlayMessage): void {
		this.store.update((state): Store | null => {
			if (state == null) {
				console.warn('Received ready-to-play message before player store was initialized');
				return null;
			}

			return R.mergeDeepRight(state, {
				session: { status: message.data.session.status },
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
