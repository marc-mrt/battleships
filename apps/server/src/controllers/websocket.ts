import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'node:http';
import {
	type ClientMessage,
	ClientMessageSchema,
	type FriendJoinedMessage,
	type GameStartedMessage,
	type ServerMessage,
	type YourTurnMessage,
} from 'game-messages';
import { InternalServerError } from './errors';
import * as SessionService from '../services/session.ts';

import { parseSessionCookie } from '../middlwares/cookies.ts';

type PlayerId = string;
const connections = new Map<PlayerId, WebSocket>();

export function setupWebSocketServer(webSocketServer: WebSocketServer): void {
	webSocketServer.on('connection', (webSocket: WebSocket, request: IncomingMessage) => {
		const session = parseSessionCookie(request.headers.cookie);

		if (!session) {
			console.log('WebSocket connection rejected: No session cookie');
			webSocket.close(1008, 'No session cookie');
			return;
		}

		const { playerId } = session;
		connections.set(playerId, webSocket);

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
		default:
			console.error(`Unknown message type: ${(message as { type: string }).type}`);
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

export function sendYourTurnMessage(playerId: string, data: YourTurnMessage['data']): void {
	const message: YourTurnMessage = { type: 'your_turn', data };
	sendMessageToPlayer(playerId, message);
}

export function sendFriendJoinedMessage(playerId: string, data: FriendJoinedMessage['data']): void {
	const message: FriendJoinedMessage = {
		type: 'friend_joined',
		data,
	};
	sendMessageToPlayer(playerId, message);
}

export function sendGameStartedMessage(playerId: string, data: GameStartedMessage['data']): void {
	const message: GameStartedMessage = {
		type: 'game_started',
		data,
	};
	sendMessageToPlayer(playerId, message);
}
