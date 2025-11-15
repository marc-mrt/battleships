import type {
	FriendJoinedMessage,
	NextTurnMessage,
	NewGameStartedMessage,
	ServerMessage,
} from 'game-messages';
import type { State } from './store.svelte';

function isStateReady(state: State): boolean {
	return state.status === 'ready';
}

interface FriendData {
	playerId: string;
	username: string;
}

function createOpponentMeta(friend: FriendData) {
	return {
		id: friend.playerId,
		username: friend.username,
	};
}

function handleFriendJoinedMessage(state: State, message: FriendJoinedMessage): State {
	if (state.status !== 'ready') {
		return state;
	}

	const opponentMeta = createOpponentMeta(message.data.friend);

	return {
		...state,
		meta: {
			...state.meta,
			session: {
				...state.meta.session,
				status: message.data.session.status,
			},
			opponent: opponentMeta,
		},
	};
}

function handleNextTurnMessage(state: State, message: NextTurnMessage): State {
	if (state.status !== 'ready') {
		return state;
	}

	return {
		...state,
		meta: {
			...state.meta,
			session: {
				...state.meta.session,
			},
		},
		game: message.data,
	};
}

function handleNewGameStartedMessage(state: State, message: NewGameStartedMessage): State {
	if (state.status !== 'ready') {
		return state;
	}

	return {
		...state,
		meta: {
			...state.meta,
			session: {
				...state.meta.session,
				status: message.data.session.status,
			},
		},
		game: null,
	};
}

type MessageHandler<T extends ServerMessage> = (state: State, message: T) => State;

type MessageHandlers = {
	[K in ServerMessage['type']]: MessageHandler<Extract<ServerMessage, { type: K }>>;
};

const MESSAGE_HANDLERS: MessageHandlers = {
	friend_joined: handleFriendJoinedMessage,
	next_turn: handleNextTurnMessage,
	new_game_started: handleNewGameStartedMessage,
};

export function handleMessage(state: State, message: ServerMessage): State {
	if (!isStateReady(state)) {
		console.warn('Received message before store was initialized');
		return state;
	}

	const handler = MESSAGE_HANDLERS[message.type] as MessageHandler<typeof message>;
	return handler(state, message);
}
