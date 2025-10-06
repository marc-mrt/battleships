import { writable } from 'svelte/store';
import * as R from 'ramda';
import * as API from '../api';
import { type FriendJoinedMessage, type GameMessage } from 'game-messages';
import type { SessionStatus } from '../models/session';

export interface PlayerStore {
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
	webSocket: WebSocket;
}

export const playerStore = writable<PlayerStore | null>(null);

interface CreateSessionPayload {
	username: string;
}
export async function createSession(payload: CreateSessionPayload) {
	const { username } = payload;

	const session = await API.createSession({ username });
	const ws = API.establishSessionConnection(
		{ playerId: session.owner.id },
		{
			onMessage: handleIncomingMessage,
		},
	);

	playerStore.set({
		session: {
			id: session.id,
			status: session.status,
		},
		player: {
			id: session.owner.id,
			username: session.owner.username,
		},
		opponent: null,
		webSocket: ws,
	});
}

interface JoinSessionPayload {
	username: string;
	sessionId: string;
}
export async function joinSession(payload: JoinSessionPayload) {
	const { username, sessionId } = payload;

	const session = await API.joinSession({ username, sessionId });
	const player = session.friend;

	if (!player) {
		throw new Error('Failed to find player in session');
	}

	const ws = API.establishSessionConnection(
		{ playerId: player.id },
		{
			onMessage: handleIncomingMessage,
		},
	);

	playerStore.set({
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
		webSocket: ws,
	});
}

function handleIncomingMessage(message: GameMessage): void {
	switch (message.type) {
		case 'friend-joined':
			return handleFriendJoinedMessage(message);
		default:
			break;
	}
}

function handleFriendJoinedMessage(message: FriendJoinedMessage): void {
	playerStore.update((state): PlayerStore | null => {
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
