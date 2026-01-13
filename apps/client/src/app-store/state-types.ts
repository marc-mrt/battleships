import type { GameState } from "game-messages";
import type { SessionStatus } from "../models/session";

export interface PlayerState {
  id: string;
  username: string;
  isOwner: boolean;
  wins: number;
}

export interface SessionState {
  slug: string;
  status: SessionStatus;
  player: PlayerState;
  opponent: PlayerState | null;
}

export type DisconnectedState = { status: "disconnected" };
export type LoadingState = { status: "loading" };
export type ErrorState = { status: "error"; error: string };
export type OnlineState = {
  status: "online";
  session: SessionState;
  game: GameState | null;
};

export type State = DisconnectedState | LoadingState | ErrorState | OnlineState;

export function createDisconnectedState(): DisconnectedState {
  return {
    status: "disconnected",
  };
}

export function createLoadingState(): LoadingState {
  return {
    status: "loading",
  };
}

export function createErrorState(message: string): ErrorState {
  return {
    status: "error",
    error: message,
  };
}

export function createOnlineState(
  session: SessionState,
  game?: GameState,
): OnlineState {
  return {
    status: "online",
    session,
    game: game ?? null,
  };
}

export function isOnline(state: State): state is OnlineState {
  return state.status === "online";
}
