import type { WSContext } from "hono/ws";
import type { Database } from "../database";
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
import { isSessionGameOver, isSessionPlaying } from "../models/session";
import * as GameStateManager from "../services/game-state-manager";
import * as SessionService from "../services/session";

interface PlayerConnection {
  ws: WSContext;
  playerId: string;
  sessionId: string;
}

/**
 * In-memory WebSocket manager for game sessions.
 * Manages all WebSocket connections across all game sessions.
 */
export class GameSessionManager {
  private sessions = new Map<string, Map<string, PlayerConnection>>();
  private wsToConnection = new Map<WSContext, PlayerConnection>();
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  registerConnection(ws: WSContext, playerId: string, sessionId: string): void {
    const connection: PlayerConnection = { ws, playerId, sessionId };

    let sessionConnections = this.sessions.get(sessionId);
    if (!sessionConnections) {
      sessionConnections = new Map();
      this.sessions.set(sessionId, sessionConnections);
    }

    const existingConnection = sessionConnections.get(playerId);
    if (existingConnection) {
      this.wsToConnection.delete(existingConnection.ws);
      try {
        existingConnection.ws.close();
      } catch {
        // Ignore close errors
      }
    }

    sessionConnections.set(playerId, connection);
    this.wsToConnection.set(ws, connection);

    console.log(
      `[GameSessionManager] Connection registered for player ${playerId} in session ${sessionId}. ` +
        `Session has ${sessionConnections.size} connection(s).`,
    );

    this.sendGameStateOnReconnection(playerId).catch((error) => {
      console.error(
        `[GameSessionManager] Error sending game state on reconnection for player ${playerId}:`,
        error,
      );
    });
  }

  handleClose(ws: WSContext): void {
    const connection = this.wsToConnection.get(ws);
    if (!connection) {
      console.warn(
        `[GameSessionManager] WebSocket closed but connection not found in map`,
      );
      return;
    }

    const { playerId, sessionId } = connection;
    console.log(
      `[GameSessionManager] WebSocket closed for player ${playerId} in session ${sessionId}`,
    );

    this.wsToConnection.delete(ws);
    const sessionConnections = this.sessions.get(sessionId);
    if (sessionConnections) {
      sessionConnections.delete(playerId);
      if (sessionConnections.size === 0) {
        this.sessions.delete(sessionId);
      }
      console.log(
        `[GameSessionManager] Session ${sessionId} now has ${sessionConnections.size} connection(s).`,
      );
    }
  }

  handleError(ws: WSContext, error: unknown): void {
    const connection = this.wsToConnection.get(ws);
    if (connection) {
      console.error(
        `[GameSessionManager] WebSocket error for player ${connection.playerId}:`,
        error,
      );
    } else {
      console.error(
        `[GameSessionManager] WebSocket error but connection not found:`,
        error,
      );
    }
    this.handleClose(ws);
  }

  async handleMessage(ws: WSContext, data: string): Promise<void> {
    const connection = this.wsToConnection.get(ws);
    if (!connection) {
      console.error(
        `[GameSessionManager] Received message but connection not found`,
      );
      return;
    }

    const { playerId } = connection;

    try {
      const json: unknown = JSON.parse(data);
      const parsed = ClientMessageSchema.safeParse(json);

      if (!parsed.success) {
        console.error(
          `[GameSessionManager] Invalid message from client ${playerId}:`,
          parsed.error,
        );
        return;
      }

      await this.handleClientMessage(playerId, parsed.data);
    } catch (error) {
      console.error(
        `[GameSessionManager] Error handling message from player ${playerId}:`,
        error,
      );
    }
  }

  notifyPlayer(
    sessionId: string,
    targetPlayerId: string,
    message: ServerMessage,
  ): void {
    this.sendToPlayer(sessionId, targetPlayerId, message);
  }

  notifyOpponentJoined(
    sessionId: string,
    targetPlayerId: string,
    data: OpponentJoinedMessage["data"],
  ): void {
    this.sendToPlayer(sessionId, targetPlayerId, {
      type: "opponent_joined",
      data,
    });
  }

  notifyOpponentDisconnected(
    sessionId: string,
    targetPlayerId: string,
    data: OpponentDisconnectedMessage["data"],
  ): void {
    this.sendToPlayer(sessionId, targetPlayerId, {
      type: "opponent_disconnected",
      data,
    });
  }

  private sendToPlayer(
    sessionId: string,
    playerId: string,
    message: ServerMessage,
  ): void {
    const sessionConnections = this.sessions.get(sessionId);
    if (!sessionConnections) {
      console.warn(
        `[GameSessionManager] Cannot send ${message.type} to player ${playerId}: session ${sessionId} not found`,
      );
      return;
    }

    const connection = sessionConnections.get(playerId);
    if (!connection || connection.ws.readyState !== 1) {
      console.warn(
        `[GameSessionManager] Cannot send ${message.type} to player ${playerId}: ` +
          `WebSocket not open (exists: ${!!connection}, readyState: ${connection?.ws.readyState})`,
      );
      return;
    }

    connection.ws.send(JSON.stringify(message));
  }

  private async sendGameStateOnReconnection(playerId: string): Promise<void> {
    try {
      const session = await SessionService.getSessionByPlayerId({
        db: this.db,
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

      const connection = Array.from(this.wsToConnection.values()).find(
        (c) => c.playerId === playerId,
      );
      if (connection) {
        this.sendToPlayer(connection.sessionId, playerId, {
          type: "game_update",
          data: gameState,
        });
      }
    } catch (error) {
      console.error(
        `[GameSessionManager] Failed to send game state on reconnection for player ${playerId}:`,
        error,
      );
    }
  }

  private async handleClientMessage(
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

  private getSessionIdForPlayer(playerId: string): string | null {
    const connection = Array.from(this.wsToConnection.values()).find(
      (c) => c.playerId === playerId,
    );
    return connection?.sessionId ?? null;
  }

  private async handlePlaceBoats(
    playerId: string,
    message: PlaceBoatsMessage,
  ): Promise<void> {
    const { boats } = message.data;
    const sessionId = this.getSessionIdForPlayer(playerId);
    if (!sessionId) {
      console.error(
        `[GameSessionManager] handlePlaceBoats: no session found for player ${playerId}`,
      );
      return;
    }

    try {
      const result = await GameStateManager.handlePlaceBoats({
        db: this.db,
        playerId,
        boats,
      });

      console.log(
        `[GameSessionManager] handlePlaceBoats result type: ${result.type} for player ${playerId}`,
      );

      if (result.type === "game_started") {
        console.log(
          `[GameSessionManager] Game started, sending game_update to both players`,
        );
        const { states } = result.result;
        console.log(
          `[GameSessionManager] Next turn player: ${states.nextTurnPlayerId}, Opponent: ${states.opponentId}`,
        );
        this.sendToPlayer(sessionId, states.nextTurnPlayerId, {
          type: "game_update",
          data: states.nextTurnState,
        });
        this.sendToPlayer(sessionId, states.opponentId, {
          type: "game_update",
          data: states.opponentState,
        });
      } else {
        console.log(
          `[GameSessionManager] Still waiting for opponent. Result type: ${result.type}`,
        );
      }
    } catch (error) {
      console.error(
        `[GameSessionManager] Error in handlePlaceBoats for player ${playerId}:`,
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
    const sessionId = this.getSessionIdForPlayer(playerId);
    if (!sessionId) {
      console.error(
        `[GameSessionManager] handleFireShot: no session found for player ${playerId}`,
      );
      return;
    }

    const result = await GameStateManager.handleShotFired({
      db: this.db,
      playerId,
      x,
      y,
    });

    if (result.type === "next_turn") {
      const { states } = result.result;
      this.sendToPlayer(sessionId, states.nextTurnPlayerId, {
        type: "game_update",
        data: states.nextTurnState,
      });
      this.sendToPlayer(sessionId, states.opponentId, {
        type: "game_update",
        data: states.opponentState,
      });
    } else {
      const { states } = result.result;
      this.sendToPlayer(sessionId, states.winnerId, {
        type: "game_update",
        data: states.winnerState,
      });
      this.sendToPlayer(sessionId, states.loserId, {
        type: "game_update",
        data: states.loserState,
      });
    }
  }

  private async handleRequestNewGame(playerId: string): Promise<void> {
    const sessionId = this.getSessionIdForPlayer(playerId);
    if (!sessionId) {
      console.error(
        `[GameSessionManager] handleRequestNewGame: no session found for player ${playerId}`,
      );
      return;
    }

    const { session, messageData } =
      await GameStateManager.handleRequestNewGame({
        db: this.db,
        playerId,
      });

    const newGameMessage: NewGameStartedMessage = {
      type: "new_game_started",
      data: messageData,
    };

    this.sendToPlayer(sessionId, session.owner.id, newGameMessage);
    this.sendToPlayer(sessionId, session.friend.id, newGameMessage);
  }
}
