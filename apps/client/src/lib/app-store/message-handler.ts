import * as R from 'ramda';
import type { FriendJoinedMessage, NextTurnMessage, ServerMessage } from 'game-messages';
import type { State } from './store.svelte';

const sessionStatusLens = R.lensPath(['meta', 'session', 'status']);
const opponentLens = R.lensPath(['meta', 'opponent']);
const gameLens = R.lensPath(['game']);

function isStateReady(state: State): boolean {
	return state.status === 'ready';
}

function createOpponentMeta(friend: { playerId: string; username: string }) {
	return {
		id: friend.playerId,
		username: friend.username,
	};
}

function updateSessionStatus(status: string) {
	return R.set(sessionStatusLens, status);
}

function updateOpponent(opponent: { id: string; username: string }) {
	return R.set(opponentLens, opponent);
}

function updateGame(game: unknown) {
	return R.set(gameLens, game);
}

function handleFriendJoinedMessage(state: State, message: FriendJoinedMessage): State {
	const opponentMeta = createOpponentMeta(message.data.friend);
	const applyStatus = updateSessionStatus(message.data.session.status);
	const applyOpponent = updateOpponent(opponentMeta);

	return R.pipe(applyStatus, applyOpponent)(state);
}

function handleNextTurnMessage(state: State, message: NextTurnMessage): State {
	const applyGame = updateGame(message.data);
	const applyStatus = updateSessionStatus(message.data.session.status);

	return R.pipe(applyGame, applyStatus)(state);
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
