import type {
  GameUpdateMessage,
  NewGameStartedMessage,
  OpponentJoinedMessage,
  ServerMessage,
} from "game-messages";
import type { WebSocket } from "ws";

type PlayerId = string;

const connections = new Map<PlayerId, WebSocket>();

export function registerConnection(playerId: string, ws: WebSocket): void {
  connections.set(playerId, ws);
}

export function removeConnection(playerId: string): void {
  connections.delete(playerId);
}

export function hasConnection(playerId: string): boolean {
  return connections.has(playerId);
}

export function getConnection(playerId: string): WebSocket | undefined {
  return connections.get(playerId);
}

function sendMessageToPlayer(playerId: string, message: ServerMessage): void {
  const webSocket = connections.get(playerId);
  if (webSocket == null) {
    console.error(`Connection for player '${playerId}' not found`);
    return;
  }
  webSocket.send(JSON.stringify(message));
}

export function sendGameUpdateMessage(
  playerId: string,
  data: GameUpdateMessage["data"],
): void {
  const message: GameUpdateMessage = { type: "game_update", data };
  sendMessageToPlayer(playerId, message);
}

export function sendOpponentJoinedMessage(
  playerId: string,
  data: OpponentJoinedMessage["data"],
): void {
  const message: OpponentJoinedMessage = {
    type: "opponent_joined",
    data,
  };
  sendMessageToPlayer(playerId, message);
}

export function sendNewGameStartedMessage(
  playerId: string,
  data: NewGameStartedMessage["data"],
): void {
  const message: NewGameStartedMessage = {
    type: "new_game_started",
    data,
  };
  sendMessageToPlayer(playerId, message);
}
