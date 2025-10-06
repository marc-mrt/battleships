import { WS_BASE_URL } from './config';
import { type GameMessage, GameMessageSchema } from 'game-messages';

interface EstablishSessionConnectionPayload {
	playerId: string;
}

interface EstablishSessionConnectionCallbacks {
	onError?: (error: Event) => void;
	onMessage: (message: GameMessage) => void;
	onClose?: () => void;
}

export function establishSessionConnection(
	payload: EstablishSessionConnectionPayload,
	callbacks: EstablishSessionConnectionCallbacks,
): WebSocket {
	const { playerId } = payload;
	const ws = new WebSocket(`${WS_BASE_URL}?playerId=${playerId}`);

	ws.onopen = () => {
		console.log(`Connected to as player ${playerId}`);
	};

	const { onMessage, onError, onClose } = callbacks;

	ws.onmessage = (event) => {
		try {
			const json: unknown = JSON.parse(event.data);
			const parsed = GameMessageSchema.safeParse(json);
			if (!parsed.success) {
				console.error('Invalid message:', parsed.error);
				return;
			}
			onMessage(parsed.data);
		} catch (error) {
			console.error('Failed to parse WebSocket message:', error);
		}
	};

	ws.onerror = (error) => {
		console.error('WebSocket error:', error);
		onError?.(error);
	};

	ws.onclose = () => {
		console.log(`Disconnected from session ${playerId}`);
		onClose?.();
	};

	return ws;
}
