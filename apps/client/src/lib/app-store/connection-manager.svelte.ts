import {
  type ClientMessage,
  type ServerMessage,
  ServerMessageSchema,
} from "game-messages";
import { SvelteSet } from "svelte/reactivity";
import { WEBSOCKET_BASE_URL } from "../../api/config";
import {
  createReconnectionStrategy,
  type ReconnectionStrategy,
} from "./reconnection-strategy";

type MessageHandler<T = ServerMessage> = (message: T) => void;
type ErrorHandler = (error: WebSocketError) => void;

interface WebSocketError {
  type: "connection" | "parse" | "send" | "reconnect";
  message: string;
  originalError?: unknown;
}

const ERROR_MESSAGES = {
  connection: "Failed to establish WebSocket connection",
  connectionEvent: "WebSocket connection error",
  parse: "Failed to parse WebSocket message",
  send: "Failed to send WebSocket message",
  notConnected: "WebSocket is not connected",
  reconnect: "Failed to reconnect after maximum attempts",
} as const;

function createErrorFactory(type: WebSocketError["type"], message: string) {
  return function createError(originalError?: unknown): WebSocketError {
    return { type, message, originalError };
  };
}

const createConnectionError = createErrorFactory(
  "connection",
  ERROR_MESSAGES.connection,
);
const createConnectionEventError = createErrorFactory(
  "connection",
  ERROR_MESSAGES.connectionEvent,
);
const createParseError = createErrorFactory("parse", ERROR_MESSAGES.parse);
const createSendError = createErrorFactory("send", ERROR_MESSAGES.send);
const createNotConnectedError = createErrorFactory(
  "send",
  ERROR_MESSAGES.notConnected,
);
const createReconnectError = createErrorFactory(
  "reconnect",
  ERROR_MESSAGES.reconnect,
);

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private messageHandlers = new SvelteSet<MessageHandler>();
  private errorHandlers = new SvelteSet<ErrorHandler>();
  private reconnectionStrategy: ReconnectionStrategy;

  connected = $state(false);
  reconnecting = $state(false);
  error = $state<WebSocketError | null>(null);

  constructor(reconnectionStrategy?: ReconnectionStrategy) {
    this.reconnectionStrategy =
      reconnectionStrategy ?? createReconnectionStrategy();
  }

  connect(): Promise<void> {
    return new Promise(this.createConnection.bind(this));
  }

  private createConnection(
    resolve: () => void,
    reject: (error: WebSocketError) => void,
  ): void {
    try {
      this.ws = new WebSocket(WEBSOCKET_BASE_URL);
      this.setupEventHandlers(resolve, reject);
    } catch (err) {
      const error = createConnectionError(err);
      this.handleError(error);
      reject(error);
    }
  }

  private setupEventHandlers(
    resolve: () => void,
    reject: (error: WebSocketError) => void,
  ): void {
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

  private handleErrorEvent(
    reject: (error: WebSocketError) => void,
    event: Event,
  ): void {
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
    return createUnsubscriber(this.messageHandlers, handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    if (this.error) {
      handler(this.error);
    }
    return createUnsubscriber(this.errorHandlers, handler);
  }

  private notifyMessageHandlers(message: ServerMessage): void {
    this.messageHandlers.forEach(callHandler(message));
  }

  private handleError(error: WebSocketError): void {
    this.error = error;
    this.logError(error);
    this.notifyErrorHandlers(error);
  }

  private logError(error: WebSocketError): void {
    console.error(
      `WebSocket ${error.type} error:`,
      error.message,
      error.originalError,
    );
  }

  private notifyErrorHandlers(error: WebSocketError): void {
    this.errorHandlers.forEach(callErrorHandler(error));
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

function createUnsubscriber<T>(set: SvelteSet<T>, item: T) {
  return (): boolean => set.delete(item);
}

function callHandler(message: ServerMessage) {
  return (handler: MessageHandler): void => handler(message);
}

function callErrorHandler(error: WebSocketError) {
  return (handler: ErrorHandler): void => handler(error);
}

let connectionManagerInstance: ConnectionManager | null = null;

export function getConnectionManager(): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager();
  }
  return connectionManagerInstance;
}
