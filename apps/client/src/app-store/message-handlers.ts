import {
  type GameUpdateMessage,
  type NewGameStartedMessage,
  type OpponentJoinedMessage,
  type ServerMessage,
  ServerMessageSchema,
} from "game-messages";
import * as R from "ramda";
import { buildPlayerState } from "./state-builders";
import { isOnline, type OnlineState, type State } from "./state-types";

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

function mergeState(
  state: OnlineState,
  partial: DeepPartial<OnlineState>,
): OnlineState {
  return R.mergeDeepRight(state, partial) as OnlineState;
}

type MessageHandler<T extends ServerMessage> = (
  state: OnlineState,
  message: T,
) => OnlineState;

type MessageHandlers = {
  [K in ServerMessage["type"]]: MessageHandler<
    Extract<ServerMessage, { type: K }>
  >;
};

function updateWithOpponentJoined(
  state: OnlineState,
  message: OpponentJoinedMessage,
): OnlineState {
  const opponent = buildPlayerState(message.data.opponent);
  return mergeState(state, {
    session: { status: message.data.session.status, opponent },
  });
}

function updateWithGameUpdate(
  state: OnlineState,
  message: GameUpdateMessage,
): OnlineState {
  return mergeState(state, {
    session: { status: message.data.session.status },
    game: message.data,
  });
}

function updateWithNewGameStarted(
  state: OnlineState,
  message: NewGameStartedMessage,
): OnlineState {
  return mergeState(state, {
    session: { status: message.data.session.status },
    game: null,
  });
}

const MESSAGE_HANDLERS: MessageHandlers = {
  opponent_joined: updateWithOpponentJoined,
  game_update: updateWithGameUpdate,
  new_game_started: updateWithNewGameStarted,
};

function parseMessage(rawMessage: string): ServerMessage | Error {
  try {
    const json = JSON.parse(rawMessage);
    const message = ServerMessageSchema.parse(json);
    return message;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }

    return new Error("Failed to parse message");
  }
}

function buildStateFromMessage(
  state: State,
  message: ServerMessage,
): OnlineState | Error {
  if (!isOnline(state)) {
    return new Error("Received message before store was online");
  }

  const handler = MESSAGE_HANDLERS[message.type] as MessageHandler<
    typeof message
  >;

  return handler(state, message);
}

export function buildStateFromRawMessage(
  state: State,
  rawMessage: string,
): OnlineState | Error {
  const result = parseMessage(rawMessage);

  if (result instanceof Error) {
    return result;
  }

  return buildStateFromMessage(state, result);
}
