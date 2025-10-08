import type { ClientMessage, ServerMessage } from 'game-messages';
import * as API from '../api';
import { SvelteSet } from 'svelte/reactivity';

type MessageHandler<T = ServerMessage> = (message: T) => void;
type ConnectionStatusHandler = (connected: boolean) => void;

export class WebsocketManagerSvelte {
	private playerId: string | null = null; // @TODO: Refactor to session cookie
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;
	private messageHandlers = new SvelteSet<MessageHandler>();
	private statusHandlers = new SvelteSet<ConnectionStatusHandler>();

	public connected = $state(false);
	public reconnecting = $state(false);

	constructor() {}

	connect(playerId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.playerId = playerId;
				this.ws = API.establishSessionConnection({ playerId });

				this.ws.onopen = () => {
					this.connected = true;
					this.reconnecting = false;
					this.reconnectAttempts = 0;
					this.notifyStatusHandlers(true);
					resolve();
				};

				this.ws.onmessage = (event) => {
					try {
						const message: ServerMessage = JSON.parse(event.data);
						this.notifyMessageHandlers(message);
					} catch (error) {
						console.error('Failed to parse message:', error);
					}
				};

				this.ws.onerror = (error) => {
					console.error('WebSocket error:', error);
					reject(error);
				};

				this.ws.onclose = () => {
					this.connected = false;
					this.notifyStatusHandlers(false);
					this.handleReconnect();
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	private handleReconnect() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnecting = true;
			this.reconnectAttempts++;

			setTimeout(() => {
				console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
				this.connect(this.playerId!).catch(() => {});
			}, this.reconnectDelay * this.reconnectAttempts);
		} else {
			console.error('Max reconnection attempts reached');
			this.reconnecting = false;
		}
	}

	send(message: ClientMessage): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.error('WebSocket is not connected');
			throw new Error('WebSocket is not connected');
		}
	}

	onMessage(handler: MessageHandler): () => void {
		this.messageHandlers.add(handler);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	onConnectionStatus(handler: ConnectionStatusHandler): () => void {
		this.statusHandlers.add(handler);
		handler(this.connected);
		return () => {
			this.statusHandlers.delete(handler);
		};
	}

	private notifyMessageHandlers(message: ServerMessage) {
		this.messageHandlers.forEach((handler) => handler(message));
	}

	private notifyStatusHandlers(connected: boolean) {
		this.statusHandlers.forEach((handler) => handler(connected));
	}

	disconnect(): void {
		this.maxReconnectAttempts = 0; // Prevent reconnection
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	get readyState(): number | undefined {
		return this.ws?.readyState;
	}
}

let websocketManager: WebsocketManagerSvelte | null = null;

export function getWebsocketManager(): WebsocketManagerSvelte {
	if (!websocketManager) {
		websocketManager = new WebsocketManagerSvelte();
	}
	return websocketManager;
}

export function resetWebsocketManager(): void {
	if (websocketManager) {
		websocketManager.disconnect();
		websocketManager = null;
	}
}
