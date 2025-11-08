import { ServerMessageSchema, type ClientMessage, type ServerMessage } from 'game-messages';
import { SvelteSet } from 'svelte/reactivity';
import { ExponentialBackoffStrategyFactory, ApiWebSocketFactory } from '../factories';

type MessageHandler<T = ServerMessage> = (message: T) => void;
type ErrorHandler = (error: WebSocketError) => void;

interface WebSocketError {
	type: 'connection' | 'parse' | 'send' | 'reconnect';
	message: string;
	originalError?: unknown;
}

interface ReconnectionStrategyFactory {
	shouldRetry(): boolean;
	computeDelay(): number;
	reset(): void;
}

interface WebSocketFactory {
	create(): WebSocket;
}

export class ConnectionManager {
	private ws: WebSocket | null = null;
	private messageHandlers = new SvelteSet<MessageHandler>();
	private errorHandlers = new SvelteSet<ErrorHandler>();

	connected = $state(false);
	reconnecting = $state(false);
	error = $state<WebSocketError | null>(null);

	constructor(
		private factory: WebSocketFactory = new ApiWebSocketFactory(),
		private reconnectionStrategy: ReconnectionStrategyFactory = new ExponentialBackoffStrategyFactory(),
	) {}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = this.factory.create();
				this.setupEventHandlers(resolve, reject);
			} catch (err) {
				const error: WebSocketError = {
					type: 'connection',
					message: 'Failed to establish WebSocket connection',
					originalError: err,
				};
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
			this.error = null;
			this.reconnectionStrategy.reset();
			resolve();
		};

		this.ws.onmessage = (event) => {
			try {
				const json = JSON.parse(event.data);
				const message: ServerMessage = ServerMessageSchema.parse(json);
				this.notifyMessageHandlers(message);
			} catch (err) {
				const error: WebSocketError = {
					type: 'parse',
					message: 'Failed to parse WebSocket message',
					originalError: err,
				};
				this.handleError(error);
			}
		};

		this.ws.onerror = (event) => {
			const error: WebSocketError = {
				type: 'connection',
				message: 'WebSocket connection error',
				originalError: event,
			};
			this.handleError(error);
			reject(error);
		};

		this.ws.onclose = () => {
			this.connected = false;
			this.handleReconnect();
		};
	}

	private handleReconnect(): void {
		if (!this.reconnectionStrategy.shouldRetry()) {
			const error: WebSocketError = {
				type: 'reconnect',
				message: 'Failed to reconnect after maximum attempts',
			};
			this.handleError(error);
			this.reconnecting = false;
			return;
		}

		this.reconnecting = true;

		const delay: number = this.reconnectionStrategy.computeDelay();
		setTimeout(() => this.connect(), delay);
	}

	send(message: ClientMessage): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(JSON.stringify(message));
			} catch (err) {
				const error: WebSocketError = {
					type: 'send',
					message: 'Failed to send WebSocket message',
					originalError: err,
				};
				this.handleError(error);
				throw error;
			}
		} else {
			const error: WebSocketError = {
				type: 'send',
				message: 'WebSocket is not connected',
			};
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

	private handleError(error: WebSocketError): void {
		this.error = error;
		console.error(`WebSocket ${error.type} error:`, error.message, error.originalError);
		this.errorHandlers.forEach((handler) => handler(error));
	}

	disconnect(): void {
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

let connectionManagerInstance: ConnectionManager | null = null;

export function getConnectionManager(): ConnectionManager {
	if (!connectionManagerInstance) {
		connectionManagerInstance = new ConnectionManager();
	}
	return connectionManagerInstance;
}
