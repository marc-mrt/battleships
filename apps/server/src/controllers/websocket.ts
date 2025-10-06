import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'node:http';
import { FriendJoinedMessage } from 'game-messages';
import { InternalServerError } from './errors';

interface PlayerConnection {
	ws: WebSocket;
}

const connections: Map<string, PlayerConnection> = new Map<string, PlayerConnection>();

export function setupWebSocketServer(wss: WebSocketServer): void {
	wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
		const url: URL = new URL(request.url || '', `http://${request.headers.host}`);
		const playerId: string | null = url.searchParams.get('playerId');

		if (!playerId) {
			ws.close(1008, 'Player ID is required');
			return;
		}

		console.log(`New connection from player ${playerId}`);
		connections.set(playerId, { ws });

		ws.on('close', () => {
			console.log(`Connection closed from player ${playerId}`);
			connections.delete(playerId);
		});

		ws.on('error', (error) => {
			console.error(`WebSocket error for player ${playerId}:`, error);
			connections.delete(playerId);
		});
	});
}

export function sendFriendJoinedMessage(playerId: string, data: FriendJoinedMessage['data']): void {
	const connection = connections.get(playerId);
	if (connection == null) {
		throw new InternalServerError(`Connection for player '${playerId}' not found`);
	}

	const message: FriendJoinedMessage = {
		type: 'friend-joined',
		data,
	};

	connection.ws.send(JSON.stringify(message));
}
