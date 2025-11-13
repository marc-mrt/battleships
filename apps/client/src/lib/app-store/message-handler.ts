import * as R from 'ramda';
import type { FriendJoinedMessage, NextTurnMessage, ServerMessage } from 'game-messages';
import type { State } from './store.svelte';

const sessionStatusLens = R.lensPath(['meta', 'session', 'status']);
const opponentLens = R.lensPath(['meta', 'opponent']);
const gameLens = R.lensPath(['game']);

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

function updateSessionStatus(status: string): (state: State) => State {
	return R.set(sessionStatusLens, status);
}

interface OpponentMeta {
	id: string;
	username: string;
}

function updateOpponent(opponent: OpponentMeta): (state: State) => State {
	return R.set(opponentLens, opponent);
}

function updateGame(game: unknown): (state: State) => State {
	return R.set(gameLens, game);
}

function handleFriendJoinedMessage(state: State, message: FriendJoinedMessage): State {
	const opponentMeta = createOpponentMeta(message.data.friend);
	const transformations = [
		updateSessionStatus(message.data.session.status),
		updateOpponent(opponentMeta),
	] as const;

	return R.pipe(...transformations)(state);
}

function handleNextTurnMessage(state: State, message: NextTurnMessage): State {
	const transformations = [
		updateGame(message.data),
		updateSessionStatus(message.data.session.status),
	] as const;

	return R.pipe(...transformations)(state);
}

type MessageHandler<T extends ServerMessage> = (state: State, message: T) => State;

type MessageHandlers = {
	[K in ServerMessage['type']]: MessageHandler<Extract<ServerMessage, { type: K }>>;
};

const MESSAGE_HANDLERS: MessageHandlers = {
	friend_joined: handleFriendJoinedMessage,
	next_turn: handleNextTurnMessage,
};

export function handleMessage(state: State, message: ServerMessage): State {
	if (!isStateReady(state)) {
		console.warn('Received message before store was initialized');
		return state;
	}

	const handler = MESSAGE_HANDLERS[message.type] as MessageHandler<typeof message>;
	return handler(state, message);
}
