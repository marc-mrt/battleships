import { WS_BASE_URL } from './config';

interface EstablishSessionConnectionPayload {
	playerId: string;
}

export function establishSessionConnection(payload: EstablishSessionConnectionPayload): WebSocket {
	const { playerId } = payload;
	return new WebSocket(`${WS_BASE_URL}?playerId=${playerId}`);
}
