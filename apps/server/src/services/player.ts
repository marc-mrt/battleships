import * as PlayerDB from "../database/player";
import type { Player } from "../models/player";

interface CreatePlayerPayload {
  db: D1Database;
  username: string;
}

export async function createPlayer(
  payload: CreatePlayerPayload,
): Promise<Player> {
  const { db, username } = payload;
  const player: Player = await PlayerDB.createPlayer({ db, username });
  return player;
}
