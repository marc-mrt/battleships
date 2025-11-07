import * as API from '../api';

export interface WebSocketFactory {
	create(): WebSocket;
}

export class SessionWebSocketFactory implements WebSocketFactory {
	create(): WebSocket {
		return API.establishSessionConnection();
	}
}
