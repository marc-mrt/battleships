import type { LastShot } from "game-messages";
import * as ShotDB from "../database/shot";
import type { Boat } from "../models/boat";
import type { Coordinates } from "../models/coordinates";
import { isSessionPlaying, type SessionPlaying } from "../models/session";
import type { Shot } from "../models/shot";
import * as BoatService from "../services/boat";
import * as SessionService from "../services/session";
import { DuplicateShotError, InvalidGameStateError } from "./errors";
import { getOpponentId, getPlayerBoats } from "./game-utils";

function isCoordinateMatch(coordinates: Coordinates) {
  return function checkCoordinate(shot: Shot): boolean {
    return shot.x === coordinates.x && shot.y === coordinates.y;
  };
}

function isShooterMatch(playerId: string) {
  return function checkShooter(shot: Shot): boolean {
    return shot.shooterId === playerId;
  };
}

function isShotAtCoordinates(playerId: string, coordinates: Coordinates) {
  return function checkShot(shot: Shot): boolean {
    return (
      isCoordinateMatch(coordinates)(shot) && isShooterMatch(playerId)(shot)
    );
  };
}

function hasAlreadyShot(
  playerId: string,
  shots: Shot[],
  coordinates: Coordinates,
): boolean {
  return shots.some(isShotAtCoordinates(playerId, coordinates));
}

function isHitOnBoat(targetId: string, boat: Boat) {
  return function checkHit(shot: Shot): boolean {
    return (
      shot.hit &&
      shot.targetId === targetId &&
      BoatService.isCoordinateOnBoat({ x: shot.x, y: shot.y })(boat)
    );
  };
}

interface CountPreviousHitsPayload {
  shots: Shot[];
  targetId: string;
  boat: Boat;
}

function countPreviousHits(payload: CountPreviousHitsPayload): number {
  const { shots, targetId, boat } = payload;
  return shots.filter(isHitOnBoat(targetId, boat)).length;
}

type ShotResult = { hit: false } | { hit: true; sunk: boolean; boatId: string };

function checkShotResult(
  session: SessionPlaying,
  opponentId: string,
  coordinates: Coordinates,
): ShotResult {
  const opponentBoats = getPlayerBoats(opponentId)(session);
  const hitBoat = opponentBoats.find(
    BoatService.isCoordinateOnBoat(coordinates),
  );

  if (!hitBoat) {
    return { hit: false };
  }

  const previousHits = countPreviousHits({
    shots: session.shots,
    targetId: opponentId,
    boat: hitBoat,
  });
  const totalHits = previousHits + 1;
  const sunk = totalHits === hitBoat.length;

  return { hit: true, sunk, boatId: hitBoat.id };
}

interface RegisterShotPayload {
  db: D1Database;
  sessionId: string;
  playerId: string;
  coordinates: Coordinates;
}

export async function registerShot(
  payload: RegisterShotPayload,
): Promise<LastShot> {
  const { db, sessionId, playerId, coordinates } = payload;

  const session = await SessionService.getSessionByPlayerId({ db, playerId });
  if (!isSessionPlaying(session)) {
    throw new InvalidGameStateError();
  }

  if (hasAlreadyShot(playerId, session.shots, coordinates)) {
    throw new DuplicateShotError();
  }

  const opponentId = getOpponentId(session, playerId);
  const result: ShotResult = checkShotResult(session, opponentId, coordinates);

  const shot = await ShotDB.recordShot({
    db,
    sessionId,
    shooterId: playerId,
    targetId: opponentId,
    x: coordinates.x,
    y: coordinates.y,
    hit: result.hit,
  });

  if (result.hit && result.sunk) {
    await BoatService.markBoatAsSunk({ db, boatId: result.boatId });
  }

  const lastShot: LastShot = {
    ...shot,
    sunkBoat: result.hit && result.sunk,
  };

  return lastShot;
}
