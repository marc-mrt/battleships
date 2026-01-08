import type { BoatPlacement, ClientMessage } from "game-messages";
import { useSyncExternalStore } from "react";
import * as API from "../api";
import { buildStateFromRawMessage } from "./message-handlers";
import { buildOnlineStateFromSession } from "./state-builders";
import {
  createDisconnectedState,
  createErrorState,
  type State,
} from "./state-types";
import { WebSocketManager } from "./websocket-manager";

type Listener = () => void;

const initialState = createDisconnectedState();

class GameStore {
  constructor(
    private state: State = initialState,
    private listeners = new Set<Listener>(),
    private wsManager = new WebSocketManager(
      this.handleIncomingMessage.bind(this),
      this.handleIncomingError.bind(this),
    ),
  ) {}

  getState(): State {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(incomingState: State): void {
    this.state = { ...incomingState };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  private handleIncomingError(error: string) {
    this.setState(createErrorState(error));
  }

  private handleIncomingMessage(rawMessage: string): void {
    const result = buildStateFromRawMessage(this.getState(), rawMessage);
    this.setState(
      result instanceof Error ? createErrorState(result.message) : result,
    );
  }

  private sendMessage(message: ClientMessage): void {
    this.wsManager.send(message);
  }

  async createSession(username: string): Promise<void> {
    const result = await API.createSession({ username });

    if (!result.success) {
      this.setState(createErrorState(result.error));
      return;
    }

    this.setState(buildOnlineStateFromSession(result.value));
    this.wsManager.connect();
  }

  async joinSession(slug: string, username: string): Promise<void> {
    const result = await API.joinSession({ slug, username });

    if (!result.success) {
      this.setState(createErrorState(result.error));
      return;
    }

    this.setState(buildOnlineStateFromSession(result.value));
    this.wsManager.connect();
  }

  async reconnectToSession(): Promise<void> {
    const result = await API.getSession();

    if (!result.success) {
      this.setState(createErrorState(result.error));
      return;
    }

    if (result.value === null) {
      return;
    }

    this.setState(buildOnlineStateFromSession(result.value));
    this.wsManager.connect();
  }

  placeBoats(boats: BoatPlacement[]): void {
    this.sendMessage({
      type: "place_boats",
      data: { boats },
    });
  }

  fireShot(x: number, y: number): void {
    this.sendMessage({
      type: "fire_shot",
      data: { x, y },
    });
  }

  requestNewGame(): void {
    this.sendMessage({
      type: "request_new_game",
    });
  }

  disconnect(): void {
    this.wsManager.disconnect();
    this.setState(createDisconnectedState());
  }

  reset(): void {
    this.disconnect();
    this.state = initialState;
    this.notifyListeners();
  }
}

const gameStore = new GameStore();

export function useGameState(): State;
export function useGameState<T>(selector: (state: State) => T): T;
export function useGameState<T>(selector?: (state: State) => T): State | T {
  return useSyncExternalStore(
    (listener) => gameStore.subscribe(listener),
    () => (selector ? selector(gameStore.getState()) : gameStore.getState()),
  );
}

export async function createSession(username: string): Promise<void> {
  return gameStore.createSession(username);
}

export async function joinSession(
  slug: string,
  username: string,
): Promise<void> {
  return gameStore.joinSession(slug, username);
}

export async function reconnectToSession(): Promise<void> {
  return gameStore.reconnectToSession();
}

export function placeBoats(boats: BoatPlacement[]): void {
  gameStore.placeBoats(boats);
}

export function fireShot(x: number, y: number): void {
  gameStore.fireShot(x, y);
}

export function requestNewGame(): void {
  gameStore.requestNewGame();
}

export function disconnect(): void {
  gameStore.disconnect();
}

export function reset(): void {
  gameStore.reset();
}
