import type { ClientMessage } from "game-messages";
import { WEBSOCKET_BASE_URL } from "../api";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

export class WebSocketManager {
  private ws: WebSocket | null = null;

  private reconnectAttempts = 0;
  private reconnectTimeoutId: number | null = null;
  private isConnecting = false;

  constructor(
    private onMessage: (data: string) => void,
    private onError: (error: string) => void,
  ) {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(WEBSOCKET_BASE_URL.toString());

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.clearReconnectTimeout();
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.onError("WebSocket connection error");
      };

      this.ws.onmessage = (event) => {
        this.onMessage(event.data);
      };
    } catch (error) {
      this.isConnecting = false;
      this.onError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  disconnect(): void {
    this.clearReconnectTimeout();
    this.reconnectAttempts = 0;
    this.isConnecting = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.onError("WebSocket is not connected");
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.onError(
        error instanceof Error ? error.message : "Failed to send message",
      );
      return false;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.onError("Maximum reconnection attempts reached");
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts++;

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect();
    }, delay);
  }
}
