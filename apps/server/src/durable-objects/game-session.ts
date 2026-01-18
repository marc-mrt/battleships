import { DurableObject } from "cloudflare:workers";
import {
  type ClientMessage,
  ClientMessageSchema,
  type FireShotMessage,
  type GameState,
  type NewGameStartedMessage,
  type OpponentDisconnectedMessage,
  type OpponentJoinedMessage,
  type PlaceBoatsMessage,
  type ServerMessage,
} from "game-messages";
import type { Env } from "../env";
import { parseSessionCookie } from "../middlewares/cookies";
import { isSessionGameOver, isSessionPlaying } from "../models/session";
import * as GameStateManager from "../services/game-state-manager";
import * as SessionService from "../services/session";

type PlayerWebSocket = WebSocket & { playerId?: string };

interface NotifyRequest {
  type: "opponent_joined" | "opponent_disconnected";
  data: OpponentJoinedMessage["data"] | OpponentDisconnectedMessage["data"];
  targetPlayerId: string;
}

export class GameSession extends DurableObject<Env> {
  private connections: Map<string, PlayerWebSocket> = new Map();
  private wsToPlayerId: Map<WebSocket, string> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/notify") {
      return this.handleNotifyRequest(request);
    }

    return this.handleWebSocketUpgrade(request);
  }

  private async handleNotifyRequest(request: Request): Promise<Response> {
    try {
      const notifyRequest = (await request.json()) as NotifyRequest;
      const { type, data, targetPlayerId } = notifyRequest;

      if (type === "opponent_joined") {
        this.sendToPlayer(targetPlayerId, {
          type: "opponent_joined",
          data: data as OpponentJoinedMessage["data"],
        });
      } else if (type === "opponent_disconnected") {
        this.sendToPlayer(targetPlayerId, {
          type: "opponent_disconnected",
          data: data as OpponentDisconnectedMessage["data"],
        });
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Error handling notify request:", error);
      return new Response("Error", { status: 500 });
    }
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const playerId = await this.authenticatePlayer(request);
    if (!playerId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    (server as PlayerWebSocket).playerId = playerId;
    this.connections.set(playerId, server as PlayerWebSocket);
    this.wsToPlayerId.set(server, playerId);
    console.log(
      `[GameSession] WebSocket connection established for player ${playerId}. Total connections: ${this.connections.size}`,
    );

    // Send game state on reconnection
    // This is important because if the connection was closed and the player reconnected,
    // they need to receive the current game state (e.g., if game started while they were disconnected)
    this.sendGameStateOnReconnection(playerId).catch((error) => {
      console.error(
        `[GameSession] Error sending game state on reconnection for player ${playerId}:`,
        error,
      );
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async authenticatePlayer(request: Request): Promise<string | null> {
    const cookieHeader = request.headers.get("Cookie");
    const session = await parseSessionCookie({
      cookieHeader,
      jwtSecret: this.env.JWT_SECRET,
    });
    return session?.playerId ?? null;
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    // Look up playerId from the reverse map since WebSocket properties may not persist
    const playerId = this.wsToPlayerId.get(ws);
    if (!playerId) {
      console.error(
        "[GameSession] Received message but playerId is missing. WebSocket not found in wsToPlayerId map.",
      );
      console.error(
        `[GameSession] Current connections: ${Array.from(this.connections.keys()).join(", ")}`,
      );
      return;
    }

    try {
      const data =
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message);
      const json: unknown = JSON.parse(data);
      const parsed = ClientMessageSchema.safeParse(json);

      if (!parsed.success) {
        console.error(
          `[GameSession] Invalid message from client ${playerId}:`,
          parsed.error,
        );
        return;
      }

      await this.handleIncomingClientMessage(playerId, parsed.data);
    } catch (error) {
      console.error(
        `[GameSession] Error handling WebSocket message from player ${playerId}:`,
        error,
      );
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const playerId = this.wsToPlayerId.get(ws);
    if (playerId) {
      console.log(`[GameSession] WebSocket closed for player ${playerId}`);
      this.connections.delete(playerId);
      this.wsToPlayerId.delete(ws);
      console.log(
        `[GameSession] Remaining connections: ${this.connections.size}`,
      );
    } else {
      console.warn(
        `[GameSession] WebSocket closed but playerId not found in map`,
      );
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const playerId = this.wsToPlayerId.get(ws);
    if (playerId) {
      console.error(
        `[GameSession] WebSocket error for player ${playerId}:`,
        error,
      );
      this.connections.delete(playerId);
      this.wsToPlayerId.delete(ws);
      console.log(
        `[GameSession] Removed connection due to error. Remaining connections: ${this.connections.size}`,
      );
    } else {
      console.error(
        `[GameSession] WebSocket error but playerId not found in map:`,
        error,
      );
    }
  }

  private sendToPlayer(playerId: string, message: ServerMessage): void {
    const ws = this.connections.get(playerId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn(
        `[GameSession] Cannot send ${message.type} to player ${playerId}: WebSocket not open (readyState: ${ws?.readyState}, exists: ${!!ws}). Player will receive state on reconnection.`,
      );
      // Note: The player will receive the current game state when they reconnect
      // via sendGameStateOnReconnection, so this is not a critical error
    }
  }

  private async sendGameStateOnReconnection(playerId: string): Promise<void> {
    try {
      const session = await SessionService.getSessionByPlayerId({
        db: this.env.DB,
        playerId,
      });

      let gameState: GameState;
      if (isSessionGameOver(session)) {
        const winner = session.winner.id === playerId ? "player" : "opponent";
        gameState = GameStateManager.createGameOverState({
          winner,
          session,
          playerId,
          lastShot: null,
        });
      } else if (isSessionPlaying(session)) {
        const isPlayerTurn = session.currentTurn.id === playerId;
        const turn = isPlayerTurn ? "player" : "opponent";
        gameState = GameStateManager.createInGameState({
          turn,
          session,
          playerId,
          lastShot: null,
        });
      } else {
        return;
      }

      this.sendToPlayer(playerId, { type: "game_update", data: gameState });
    } catch (error) {
      console.error(
        `[GameSession] Failed to send game state on reconnection for player ${playerId}:`,
        error,
      );
    }
  }

  private async handleIncomingClientMessage(
    playerId: string,
    message: ClientMessage,
  ): Promise<void> {
    switch (message.type) {
      case "place_boats":
        await this.handlePlaceBoats(playerId, message);
        break;
      case "fire_shot":
        await this.handleFireShot(playerId, message);
        break;
      case "request_new_game":
        await this.handleRequestNewGame(playerId);
        break;
    }
  }

  private async handlePlaceBoats(
    playerId: string,
    message: PlaceBoatsMessage,
  ): Promise<void> {
    const { boats } = message.data;

    try {
      const result = await GameStateManager.handlePlaceBoats({
        db: this.env.DB,
        playerId,
        boats,
      });

      console.log(
        `[GameSession] handlePlaceBoats result type: ${result.type} for player ${playerId}`,
      );

      if (result.type === "game_started") {
        console.log(
          `[GameSession] Game started, sending game_update to both players`,
        );
        const { states } = result.result;
        console.log(
          `[GameSession] Next turn player: ${states.nextTurnPlayerId}, Opponent: ${states.opponentId}`,
        );
        this.sendToPlayer(states.nextTurnPlayerId, {
          type: "game_update",
          data: states.nextTurnState,
        });
        this.sendToPlayer(states.opponentId, {
          type: "game_update",
          data: states.opponentState,
        });
      } else {
        console.log(
          `[GameSession] Still waiting for opponent. Result type: ${result.type}`,
        );
      }
    } catch (error) {
      console.error(
        `[GameSession] Error in handlePlaceBoats for player ${playerId}:`,
        error,
      );
      throw error;
    }
  }

  private async handleFireShot(
    playerId: string,
    message: FireShotMessage,
  ): Promise<void> {
    const { x, y } = message.data;
    const result = await GameStateManager.handleShotFired({
      db: this.env.DB,
      playerId,
      x,
      y,
    });

    if (result.type === "next_turn") {
      const { states } = result.result;
      this.sendToPlayer(states.nextTurnPlayerId, {
        type: "game_update",
        data: states.nextTurnState,
      });
      this.sendToPlayer(states.opponentId, {
        type: "game_update",
        data: states.opponentState,
      });
    } else {
      const { states } = result.result;
      this.sendToPlayer(states.winnerId, {
        type: "game_update",
        data: states.winnerState,
      });
      this.sendToPlayer(states.loserId, {
        type: "game_update",
        data: states.loserState,
      });
    }
  }

  private async handleRequestNewGame(playerId: string): Promise<void> {
    const { session, messageData } =
      await GameStateManager.handleRequestNewGame({
        db: this.env.DB,
        playerId,
      });

    const newGameMessage: NewGameStartedMessage = {
      type: "new_game_started",
      data: messageData,
    };

    this.sendToPlayer(session.owner.id, newGameMessage);
    this.sendToPlayer(session.friend.id, newGameMessage);
  }
}
