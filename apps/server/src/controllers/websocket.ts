import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'node:http';
import {
	type ClientMessage,
	ClientMessageSchema,
	type FriendJoinedMessage,
	type NextTurnMessage,
	type ServerMessage,
} from 'game-messages';
import { InternalServerError } from './errors';
import * as SessionService from '../services/session.ts';
import { parseSessionCookie } from '../middlwares/cookies.ts';
import { createGameState } from '../services/game-state-manager.ts';

const WEBSOCKET_CLOSE_CODE_POLICY_VIOLATION = 1008;

type PlayerId = string;
const connections = new Map<PlayerId, WebSocket>();

export function setupWebSocketServer(webSocketServer: WebSocketServer): void {
	webSocketServer.on('connection', async (webSocket: WebSocket, request: IncomingMessage) => {
		const session = parseSessionCookie(request.headers.cookie);

		if (!session) {
			console.log('WebSocket connection rejected: No session cookie');
			webSocket.close(WEBSOCKET_CLOSE_CODE_POLICY_VIOLATION, 'No session cookie');
			return;
		}

		const { playerId } = session;
		connections.set(playerId, webSocket);

		await sendGameStateOnReconnection(playerId);

		webSocket.on('message', async (data: Buffer) => {
			try {
				const json: unknown = JSON.parse(data.toString());
				const parsed = ClientMessageSchema.safeParse(json);

				if (!parsed.success) {
					console.error('Invalid message from client:', parsed.error);
					return;
				}

				const message: ClientMessage = parsed.data;
				await handleIncomingClientMessage(playerId, message);
			} catch (error) {
				console.error('Error handling WebSocket message:', error);
			}
		});

		webSocket.on('close', () => {
			connections.delete(playerId);
		});

		webSocket.on('error', (error) => {
			console.error(`WebSocket error for player ${playerId}:`, error);
			connections.delete(playerId);
		});
	});
}

async function handleIncomingClientMessage(
	playerId: string,
	message: ClientMessage,
): Promise<void> {
	switch (message.type) {
		case 'place_boats':
			await SessionService.saveBoats({
				playerId,
				...message.data,
			});
			break;
		case 'fire_shot': {
			await SessionService.handleShotFired({ playerId, ...message.data });
			break;
		}
		default: {
			const _exhaustive: never = message;
			console.error(`Unknown message type: ${(_exhaustive as { type: string }).type}`);
		}
	}
}

function getConnectionForPlayer(playerId: string): WebSocket {
	const webSocket: WebSocket | undefined = connections.get(playerId);
	if (webSocket == null) {
		throw new InternalServerError(`Connection for player '${playerId}' not found`);
	}
	return webSocket;
}

function sendMessageToPlayer(playerId: string, message: ServerMessage): void {
	const webSocket = getConnectionForPlayer(playerId);
	webSocket.send(JSON.stringify(message));
}

export function sendNextTurnMessage(playerId: string, data: NextTurnMessage['data']): void {
	const message: NextTurnMessage = { type: 'next_turn', data };
	sendMessageToPlayer(playerId, message);
}

export function sendFriendJoinedMessage(playerId: string, data: FriendJoinedMessage['data']): void {
	const message: FriendJoinedMessage = {
		type: 'friend_joined',
		data,
	};
	sendMessageToPlayer(playerId, message);
}

async function sendGameStateOnReconnection(playerId: string): Promise<void> {
	try {
		const session = await SessionService.getSessionByPlayerId(playerId);

		if (session.status !== 'in_game') {
			return;
		}

		const isPlayerTurn = session.currentTurn.id === playerId;
		const turn = isPlayerTurn ? 'player_turn' : 'opponent_turn';

		const gameState = createGameState({
			turn,
			session,
			playerId,
			lastShot: null,
		});

		sendNextTurnMessage(playerId, gameState);
	} catch (error) {
		console.error(`Failed to send game state on reconnection for player ${playerId}:`, error);
	}
}
