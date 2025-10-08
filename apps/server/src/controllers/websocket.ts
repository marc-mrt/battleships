import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'node:http';
import {
	ClientMessage,
	ClientMessageSchema,
	type FriendJoinedMessage,
	ReadyToPlayMessage,
} from 'game-messages';
import { InternalServerError } from './errors';
import * as GameService from '../services/game';
import type { PlayerId } from '../models/player.ts';

const connections = new Map<PlayerId, WebSocket>();

export function setupWebSocketServer(webSocketServer: WebSocketServer): void {
	webSocketServer.on('connection', (webSocket: WebSocket, request: IncomingMessage) => {
		const url: URL = new URL(request.url || '', `http://${request.headers.host}`);
		const playerId: string | null = url.searchParams.get('playerId');

		if (!playerId) {
			webSocket.close(1008, 'Player ID is required');
			return;
		}

		connections.set(playerId, webSocket);

		webSocket.on('message', async (data: Buffer) => {
			try {
				const json: unknown = JSON.parse(data.toString());
				const parsed = ClientMessageSchema.safeParse(json);

				if (!parsed.success) {
					console.error('Invalid message from client:', parsed.error);
					return;
				}

				const message = parsed.data;
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
		case 'player-placed-boats':
			await GameService.saveBoatPlacements({
				playerId,
				...message.data,
			});
			break;
		default:
			console.error(`Unknown message type: ${message.type}`);
	}
}

export function sendFriendJoinedMessage(playerId: string, data: FriendJoinedMessage['data']): void {
	const webSocket: WebSocket | undefined = connections.get(playerId);
	if (webSocket == null) {
		throw new InternalServerError(`Connection for player '${playerId}' not found`);
	}

	const message: FriendJoinedMessage = {
		type: 'friend-joined',
		data,
	};

	webSocket.send(JSON.stringify(message));
}

export function sendReadyToPlayMessage(playerId: string, data: ReadyToPlayMessage['data']): void {
	const webSocket: WebSocket | undefined = connections.get(playerId);
	if (webSocket == null) {
		throw new InternalServerError(`Connection for player '${playerId}' not found`);
	}

	const message: ReadyToPlayMessage = {
		type: 'ready-to-play',
		data,
	};

	webSocket.send(JSON.stringify(message));
}
