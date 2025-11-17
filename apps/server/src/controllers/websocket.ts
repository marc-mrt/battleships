import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'node:http';
import {
	type ClientMessage,
	ClientMessageSchema,
	type OpponentJoinedMessage,
	GameState,
	type NextTurnMessage,
	type ServerMessage,
	type NewGameStartedMessage,
} from 'game-messages';
import { InternalServerError } from './errors';
import * as SessionService from '../services/session.ts';
import * as GameStateManager from '../services/game-state-manager.ts';
import { parseSessionCookie } from '../middlwares/cookies.ts';
import { SessionGameOver } from '../models/session.ts';

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
		case 'place_boats': {
			const { boats } = message.data;
			await GameStateManager.handlePlaceBoats(playerId, boats);
			break;
		}
		case 'fire_shot': {
			const { x, y } = message.data;
			await GameStateManager.handleShotFired(playerId, x, y);
			break;
		}
		case 'request_new_game': {
			await GameStateManager.handleRequestNewGame(playerId);
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

export function sendOpponentJoinedMessage(
	playerId: string,
	data: OpponentJoinedMessage['data'],
): void {
	const message: OpponentJoinedMessage = {
		type: 'opponent_joined',
		data,
	};
	sendMessageToPlayer(playerId, message);
}

export function sendNewGameStartedMessage(
	playerId: string,
	data: NewGameStartedMessage['data'],
): void {
	const message: NewGameStartedMessage = {
		type: 'new_game_started',
		data,
	};
	sendMessageToPlayer(playerId, message);
}

async function sendGameStateOnReconnection(playerId: string): Promise<void> {
	try {
		const session = await SessionService.getSessionByPlayerId(playerId);

		if (session.status === 'playing') {
			let gameState: GameState;
			if ((session as SessionGameOver).winner != null) {
				const winner = (session as SessionGameOver).winner.id === playerId ? 'player' : 'opponent';
				gameState = GameStateManager.createGameOverState({
					winner,
					session,
					playerId,
					lastShot: null,
				});
			} else {
				const isPlayerTurn = session.currentTurn.id === playerId;
				const turn = isPlayerTurn ? 'player' : 'opponent';
				gameState = GameStateManager.createInGameState({
					turn,
					session,
					playerId,
					lastShot: null,
				});
			}

			sendNextTurnMessage(playerId, gameState);
		} else {
			return;
		}
	} catch (error) {
		console.error(`Failed to send game state on reconnection for player ${playerId}:`, error);
	}
}
