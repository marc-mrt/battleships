import * as PlayerDB from '../database/player.ts';
import { Player } from '../models/player.ts';

interface CreatePlayerPayload {
	username: string;
}

export async function createPlayer(payload: CreatePlayerPayload): Promise<Player> {
	const { username } = payload;
	const player: Player = await PlayerDB.createPlayer({ username });
	return player;
}
