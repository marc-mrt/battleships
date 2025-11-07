import type { ClientMessage, ServerMessage } from 'game-messages';
import { SvelteSet } from 'svelte/reactivity';
import {
	type ReconnectionStrategy,
	ExponentialBackoffStrategy,
} from '../domain/reconnection-strategy';
import { type WebSocketFactory, SessionWebSocketFactory } from '../domain/websocket-factory';

type MessageHandler<T = ServerMessage> = (message: T) => void;
type ConnectionStatusHandler = (connected: boolean) => void;
type ErrorHandler = (error: WebSocketError) => void;

export interface WebSocketError {
	type: 'connection' | 'parse' | 'send' | 'reconnect';
	message: string;
	originalError?: unknown;
}

export class WebsocketManagerSvelte {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private messageHandlers = new SvelteSet<MessageHandler>();
	private statusHandlers = new SvelteSet<ConnectionStatusHandler>();
	private errorHandlers = new SvelteSet<ErrorHandler>();

	connected = $state(false);
	reconnecting = $state(false);
	error = $state<WebSocketError | null>(null);

	constructor(
		private factory: WebSocketFactory = new SessionWebSocketFactory(),
		private reconnectionStrategy: ReconnectionStrategy = new ExponentialBackoffStrategy(),
	) {}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = this.factory.create();
				this.setupEventHandlers(resolve, reject);
			} catch (err) {
				const error = this.createError(
					'connection',
					'Failed to establish WebSocket connection',
					err,
				);
				this.handleError(error);
				reject(error);
			}
		});
	}

	private setupEventHandlers(resolve: () => void, reject: (error: WebSocketError) => void): void {
		if (!this.ws) return;

		this.ws.onopen = () => {
			this.connected = true;
			this.reconnecting = false;
			this.reconnectAttempts = 0;
			this.error = null;
			this.reconnectionStrategy.reset();
			this.notifyStatusHandlers(true);
			resolve();
		};

		this.ws.onmessage = (event) => {
			try {
				const message: ServerMessage = JSON.parse(event.data);
				this.notifyMessageHandlers(message);
			} catch (err) {
				const error = this.createError('parse', 'Failed to parse WebSocket message', err);
				this.handleError(error);
			}
		};

		this.ws.onerror = (event) => {
			const error = this.createError('connection', 'WebSocket connection error', event);
			this.handleError(error);
			reject(error);
		};

		this.ws.onclose = () => {
			this.connected = false;
			this.notifyStatusHandlers(false);
			this.handleReconnect();
		};
	}

	private handleReconnect(): void {
		if (!this.reconnectionStrategy.shouldRetry(this.reconnectAttempts)) {
			this.handleMaxRetriesExceeded();
			return;
		}

		this.reconnecting = true;
		this.reconnectAttempts++;

		const delay = this.reconnectionStrategy.getDelay(this.reconnectAttempts);
		setTimeout(() => this.attemptReconnect(), delay);
	}

	private attemptReconnect(): void {
		console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
		this.connect().catch(() => {
			// Error already handled in connect()
		});
	}

	private handleMaxRetriesExceeded(): void {
		const error = this.createError('reconnect', `Failed to reconnect after maximum attempts`);
		this.handleError(error);
		this.reconnecting = false;
	}

	send(message: ClientMessage): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(JSON.stringify(message));
			} catch (err) {
				const error = this.createError('send', 'Failed to send WebSocket message', err);
				this.handleError(error);
				throw error;
			}
		} else {
			const error = this.createError('send', 'WebSocket is not connected');
			this.handleError(error);
			throw error;
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

	onError(handler: ErrorHandler): () => void {
		this.errorHandlers.add(handler);
		if (this.error) {
			handler(this.error);
		}
		return () => {
			this.errorHandlers.delete(handler);
		};
	}

	private notifyMessageHandlers(message: ServerMessage): void {
		this.messageHandlers.forEach((handler) => handler(message));
	}

	private notifyStatusHandlers(connected: boolean): void {
		this.statusHandlers.forEach((handler) => handler(connected));
	}

	private createError(
		type: WebSocketError['type'],
		message: string,
		originalError?: unknown,
	): WebSocketError {
		return { type, message, originalError };
	}

	private handleError(error: WebSocketError): void {
		this.error = error;
		console.error(`WebSocket ${error.type} error:`, error.message, error.originalError);
		this.errorHandlers.forEach((handler) => handler(error));
	}

	disconnect(): void {
		this.reconnectAttempts = Number.MAX_SAFE_INTEGER;
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.connected = false;
		this.reconnecting = false;
		this.error = null;
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
