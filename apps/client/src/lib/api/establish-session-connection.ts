import { WS_BASE_URL } from './config';

export function establishSessionConnection(): WebSocket {
	return new WebSocket(WS_BASE_URL);
}
