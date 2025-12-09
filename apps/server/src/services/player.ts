import * as PlayerDB from "../database/player";
import type { Player } from "../models/player";

interface CreatePlayerPayload {
  username: string;
}

export async function createPlayer(
  payload: CreatePlayerPayload,
): Promise<Player> {
  const { username } = payload;
  const player: Player = await PlayerDB.createPlayer({ username });
  return player;
}
