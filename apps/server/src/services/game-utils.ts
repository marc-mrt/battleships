import type { LastShot } from "game-messages";
import * as R from "ramda";
import type { Boat } from "../models/boat";
import type { SessionGameOver, SessionPlaying } from "../models/session";
import type { Shot } from "../models/shot";
import { InvalidTurnError } from "./errors";

export function validatePlayerTurn(
  session: SessionPlaying,
  playerId: string,
): void {
  if (session.currentTurn.id !== playerId) {
    throw new InvalidTurnError();
  }
}

export function getOpponentId(
  session: SessionPlaying | SessionGameOver,
  playerId: string,
): string {
  return playerId === session.owner.id ? session.friend.id : session.owner.id;
}

export function determineNextTurnPlayer(
  playerId: string,
  opponentId: string,
  lastShot: LastShot,
): string {
  if (!lastShot.hit) {
    return opponentId;
  }
  if (lastShot.sunkBoat) {
    return opponentId;
  }
  return playerId;
}

export function getPlayerBoats(playerId: string) {
  return function extractBoats(
    session: SessionPlaying | SessionGameOver,
  ): Boat[] {
    return playerId === session.owner.id
      ? session.ownerBoats
      : session.friendBoats;
  };
}

function isShooter(playerId: string) {
  return R.propEq(playerId, "shooterId");
}

function isTarget(playerId: string) {
  return R.propEq(playerId, "targetId");
}

export function getPlayerShots(playerId: string) {
  return function filterShots(shots: Shot[]): Shot[] {
    return shots.filter(isShooter(playerId));
  };
}

export function getOpponentShotsAgainstPlayer(playerId: string) {
  return function filterShots(shots: Shot[]): Shot[] {
    return shots.filter(isTarget(playerId));
  };
}

export function getSunkOpponentBoats(playerId: string) {
  return function filterBoats(
    session: SessionPlaying | SessionGameOver,
  ): Boat[] {
    const opponentBoats =
      playerId === session.owner.id ? session.friendBoats : session.ownerBoats;
    return opponentBoats.filter(R.prop("sunk"));
  };
}
