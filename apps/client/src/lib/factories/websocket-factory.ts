import * as API from '../api';

export class ApiWebSocketFactory {
	create(): WebSocket {
		return new WebSocket(API.WEBSOCKET_BASE_URL);
	}
}
