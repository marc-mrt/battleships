import type { IncomingMessage } from "node:http";
import {
  type ClientMessage,
  ClientMessageSchema,
  type FireShotMessage,
  type GameState,
  type PlaceBoatsMessage,
} from "game-messages";
import type { WebSocket, WebSocketServer } from "ws";
import { parseSessionCookie } from "../middlewares/cookies";
import { isSessionGameOver, isSessionPlaying } from "../models/session";
import * as GameStateManager from "../services/game-state-manager";
import * as SessionService from "../services/session";
import * as WebSocketBroadcaster from "../services/websocket-broadcaster";

const WEBSOCKET_CLOSE_CODE_POLICY_VIOLATION = 1008;

export function setupWebSocketServer(webSocketServer: WebSocketServer): void {
  webSocketServer.on(
    "connection",
    async (webSocket: WebSocket, request: IncomingMessage) => {
      const session = parseSessionCookie(request.headers.cookie);

      if (!session) {
        logConnectionRejection("No session cookie");
        webSocket.close(
          WEBSOCKET_CLOSE_CODE_POLICY_VIOLATION,
          "No session cookie",
        );
        return;
      }

      const { playerId } = session;
      WebSocketBroadcaster.registerConnection(playerId, webSocket);

      await sendGameStateOnReconnection(playerId);

      webSocket.on("message", async (data: Buffer) => {
        let json: unknown;
        try {
          json = JSON.parse(data.toString());
        } catch {
          logInvalidMessage("Malformed JSON");
          return;
        }

        try {
          const parsed = ClientMessageSchema.safeParse(json);

          if (!parsed.success) {
            logInvalidMessage(parsed.error);
            return;
          }

          const message: ClientMessage = parsed.data;
          await handleIncomingClientMessage(playerId, message);
        } catch (error) {
          logMessageHandlingError(error);
        }
      });

      webSocket.on("close", () => {
        WebSocketBroadcaster.removeConnection(playerId);
      });

      webSocket.on("error", (error) => {
        logWebSocketError(playerId, error);
        WebSocketBroadcaster.removeConnection(playerId);
      });
    },
  );
}

function logConnectionRejection(reason: string): void {
  console.log(`WebSocket connection rejected: ${reason}`);
}

function logInvalidMessage(error: unknown): void {
  console.error("Invalid message from client:", error);
}

function logMessageHandlingError(error: unknown): void {
  console.error("Error handling WebSocket message:", error);
}

function logWebSocketError(playerId: string, error: unknown): void {
  console.error(`WebSocket error for player ${playerId}:`, error);
}

function logReconnectionError(playerId: string, error: unknown): void {
  console.error(
    `Failed to send game state on reconnection for player ${playerId}:`,
    error,
  );
}

type MessageHandler<T extends ClientMessage> = (
  playerId: string,
  message: T,
) => Promise<void>;

type MessageHandlers = {
  [K in ClientMessage["type"]]: MessageHandler<
    Extract<ClientMessage, { type: K }>
  >;
};

async function handlePlaceBoats(
  playerId: string,
  message: PlaceBoatsMessage,
): Promise<void> {
  const { boats } = message.data;
  await GameStateManager.handlePlaceBoats(playerId, boats);
}

async function handleFireShot(
  playerId: string,
  message: FireShotMessage,
): Promise<void> {
  const { x, y } = message.data;
  await GameStateManager.handleShotFired(playerId, x, y);
}

async function handleRequestNewGame(playerId: string): Promise<void> {
  await GameStateManager.handleRequestNewGame(playerId);
}

const MESSAGE_HANDLERS: MessageHandlers = {
  place_boats: handlePlaceBoats,
  fire_shot: handleFireShot,
  request_new_game: handleRequestNewGame,
};

async function handleIncomingClientMessage(
  playerId: string,
  message: ClientMessage,
): Promise<void> {
  const handler = MESSAGE_HANDLERS[message.type] as MessageHandler<
    typeof message
  >;
  await handler(playerId, message);
}

async function sendGameStateOnReconnection(playerId: string): Promise<void> {
  try {
    const session = await SessionService.getSessionByPlayerId(playerId);

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

    WebSocketBroadcaster.sendGameUpdateMessage(playerId, gameState);
  } catch (error) {
    logReconnectionError(playerId, error);
  }
}
