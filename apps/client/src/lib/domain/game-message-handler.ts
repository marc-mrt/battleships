import type { FriendJoinedMessage, NextTurnMessage, ServerMessage } from 'game-messages';
import type { StoreData } from '../services/game-store.svelte';

export class GameMessageHandler {
	handleFriendJoined(message: FriendJoinedMessage, currentData: StoreData): StoreData {
		return {
			...currentData,
			opponent: {
				id: message.data.friend.playerId,
				username: message.data.friend.username,
			},
			session: {
				...currentData.session,
				status: message.data.session.status,
			},
		};
	}

	handleNextTurn(message: NextTurnMessage, currentData: StoreData): StoreData {
		return {
			...currentData,
			session: {
				...currentData.session,
				status: message.data.session.status,
			},
			game: message.data,
		};
	}

	handleMessage(message: ServerMessage, currentData: StoreData): StoreData | null {
		switch (message.type) {
			case 'friend_joined':
				return this.handleFriendJoined(message, currentData);
			case 'next_turn':
				return this.handleNextTurn(message, currentData);
			default:
				return null;
		}
	}
}
