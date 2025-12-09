import type {
  NewGameStartedMessage,
  NextTurnMessage,
  OpponentJoinedMessage,
  ServerMessage,
} from "game-messages";
import { extractOpponentMetadata } from "./state-builder";
import type { State } from "./state-types";

function isStateReady(state: State): boolean {
  return state.status === "ready";
}

function handleOpponentJoinedMessage(
  state: State,
  message: OpponentJoinedMessage,
): State {
  if (state.status !== "ready") {
    return state;
  }

  const opponentMeta = extractOpponentMetadata(message.data.opponent);

  return {
    ...state,
    meta: {
      ...state.meta,
      session: {
        ...state.meta.session,
        status: message.data.session.status,
      },
      opponent: opponentMeta,
    },
  };
}

function handleNextTurnMessage(state: State, message: NextTurnMessage): State {
  if (state.status !== "ready") {
    return state;
  }

  return {
    ...state,
    meta: {
      ...state.meta,
      session: {
        ...state.meta.session,
        status: message.data.session.status,
      },
    },
    game: message.data,
  };
}

function handleNewGameStartedMessage(
  state: State,
  message: NewGameStartedMessage,
): State {
  if (state.status !== "ready") {
    return state;
  }

  return {
    ...state,
    meta: {
      ...state.meta,
      session: {
        ...state.meta.session,
        status: message.data.session.status,
      },
    },
    game: null,
  };
}

type MessageHandler<T extends ServerMessage> = (
  state: State,
  message: T,
) => State;

type MessageHandlers = {
  [K in ServerMessage["type"]]: MessageHandler<
    Extract<ServerMessage, { type: K }>
  >;
};

const MESSAGE_HANDLERS: MessageHandlers = {
  opponent_joined: handleOpponentJoinedMessage,
  next_turn: handleNextTurnMessage,
  new_game_started: handleNewGameStartedMessage,
};

export function handleMessage(state: State, message: ServerMessage): State {
  if (!isStateReady(state)) {
    console.warn("Received message before store was initialized");
    return state;
  }

  const handler = MESSAGE_HANDLERS[message.type] as MessageHandler<
    typeof message
  >;
  return handler(state, message);
}
