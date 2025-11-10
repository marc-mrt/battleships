import { ServerMessageSchema, type ClientMessage, type ServerMessage } from 'game-messages';
import { SvelteSet } from 'svelte/reactivity';
import { WEBSOCKET_BASE_URL } from '../../api/config';
import { createReconnectionStrategy, type ReconnectionStrategy } from './reconnection-strategy';

type MessageHandler<T = ServerMessage> = (message: T) => void;
type ErrorHandler = (error: WebSocketError) => void;

interface WebSocketError {
	type: 'connection' | 'parse' | 'send' | 'reconnect';
	message: string;
	originalError?: unknown;
}

function createWebSocketError(
	type: 'connection' | 'parse' | 'send' | 'reconnect',
	message: string,
	originalError?: unknown,
): WebSocketError {
	return { type, message, originalError };
}

function createConnectionError(err: unknown): WebSocketError {
	return createWebSocketError('connection', 'Failed to establish WebSocket connection', err);
}

function createParseError(err: unknown): WebSocketError {
	return createWebSocketError('parse', 'Failed to parse WebSocket message', err);
}

function createConnectionEventError(event: Event): WebSocketError {
	return createWebSocketError('connection', 'WebSocket connection error', event);
}

function createSendError(err: unknown): WebSocketError {
	return createWebSocketError('send', 'Failed to send WebSocket message', err);
}

function createNotConnectedError(): WebSocketError {
	return createWebSocketError('send', 'WebSocket is not connected');
}

function createReconnectError(): WebSocketError {
	return createWebSocketError('reconnect', 'Failed to reconnect after maximum attempts');
}

export class ConnectionManager {
	private ws: WebSocket | null = null;
	private messageHandlers = new SvelteSet<MessageHandler>();
	private errorHandlers = new SvelteSet<ErrorHandler>();
	private reconnectionStrategy: ReconnectionStrategy;

	connected = $state(false);
	reconnecting = $state(false);
	error = $state<WebSocketError | null>(null);

	constructor(reconnectionStrategy?: ReconnectionStrategy) {
		this.reconnectionStrategy = reconnectionStrategy ?? createReconnectionStrategy();
	}

	connect(): Promise<void> {
		return new Promise(this.createConnection.bind(this));
	}

	private createConnection(resolve: () => void, reject: (error: WebSocketError) => void): void {
		try {
			this.ws = new WebSocket(WEBSOCKET_BASE_URL);
			this.setupEventHandlers(resolve, reject);
		} catch (err) {
			const error = createConnectionError(err);
			this.handleError(error);
			reject(error);
		}
	}

	private setupEventHandlers(resolve: () => void, reject: (error: WebSocketError) => void): void {
		if (!this.ws) return;

		this.ws.onopen = this.handleOpen.bind(this, resolve);
		this.ws.onmessage = this.handleMessage.bind(this);
		this.ws.onerror = this.handleErrorEvent.bind(this, reject);
		this.ws.onclose = this.handleClose.bind(this);
	}

	private handleOpen(resolve: () => void): void {
		this.connected = true;
		this.reconnecting = false;
		this.error = null;
		this.reconnectionStrategy.reset();
		resolve();
	}

	private handleMessage(event: MessageEvent): void {
		try {
			const json = JSON.parse(event.data);
			const message: ServerMessage = ServerMessageSchema.parse(json);
			this.notifyMessageHandlers(message);
		} catch (err) {
			const error = createParseError(err);
			this.handleError(error);
		}
	}

	private handleErrorEvent(reject: (error: WebSocketError) => void, event: Event): void {
		const error = createConnectionEventError(event);
		this.handleError(error);
		reject(error);
	}

	private handleClose(): void {
		this.connected = false;
		this.handleReconnect();
	}

	private handleReconnect(): void {
		const shouldAttempt = this.reconnectionStrategy.shouldReconnect();
		if (!shouldAttempt) {
			this.handleReconnectFailure();
			return;
		}

		this.attemptReconnection();
	}

	private handleReconnectFailure(): void {
		const error = createReconnectError();
		this.handleError(error);
		this.reconnecting = false;
	}

	private attemptReconnection(): void {
		this.reconnecting = true;
		this.reconnectionStrategy.incrementAttempts();

		const delay = this.reconnectionStrategy.getDelay();
		setTimeout(this.reconnect.bind(this), delay);
	}

	private reconnect(): void {
		this.connect();
	}

	send(message: ClientMessage): void {
		const isConnected = this.ws?.readyState === WebSocket.OPEN;
		if (!isConnected) {
			this.throwNotConnectedError();
		}

		this.sendMessage(message);
	}

	private throwNotConnectedError(): never {
		const error = createNotConnectedError();
		this.handleError(error);
		throw error;
	}

	private sendMessage(message: ClientMessage): void {
		try {
			const json = JSON.stringify(message);
			this.ws!.send(json);
		} catch (err) {
			const error = createSendError(err);
			this.handleError(error);
			throw error;
		}
	}

	onMessage(handler: MessageHandler): () => void {
		this.messageHandlers.add(handler);
		return this.createUnsubscriber(this.messageHandlers, handler);
	}

	onError(handler: ErrorHandler): () => void {
		this.errorHandlers.add(handler);
		if (this.error) {
			handler(this.error);
		}
		return this.createUnsubscriber(this.errorHandlers, handler);
	}

	private createUnsubscriber<T>(set: SvelteSet<T>, item: T) {
		return function unsubscribe(): void {
			set.delete(item);
		};
	}

	private notifyMessageHandlers(message: ServerMessage): void {
		function callHandler(handler: MessageHandler): void {
			handler(message);
		}
		this.messageHandlers.forEach(callHandler);
	}

	private handleError(error: WebSocketError): void {
		this.error = error;
		this.logError(error);
		this.notifyErrorHandlers(error);
	}

	private logError(error: WebSocketError): void {
		console.error(`WebSocket ${error.type} error:`, error.message, error.originalError);
	}

	private notifyErrorHandlers(error: WebSocketError): void {
		function callHandler(handler: ErrorHandler): void {
			handler(error);
		}
		this.errorHandlers.forEach(callHandler);
	}

	disconnect(): void {
		this.closeWebSocket();
		this.resetState();
	}

	private closeWebSocket(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	private resetState(): void {
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
