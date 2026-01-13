import type { Player } from "../models/player";
import type { Session } from "../models/session";
import {
  createOnlineState,
  type OnlineState,
  type PlayerState,
  type SessionState,
} from "./state-types";

export function buildPlayerState(player: Player): PlayerState {
  return {
    id: player.id,
    username: player.username,
    isOwner: player.isOwner,
    wins: player.wins,
  };
}

export function buildOnlineStateFromSession(session: Session): OnlineState {
  const state: SessionState = {
    slug: session.slug,
    status: session.status,
    player: buildPlayerState(session.player),
    opponent: session.opponent ? buildPlayerState(session.opponent) : null,
  };
  return createOnlineState(state);
}
