import * as SessionDB from '../database/session';
import { Session } from '../models/session';
import { Player } from '../models/player';
import * as PlayerService from './player';

interface CreateSessionPayload {
	username: string;
}
export async function createSession(payload: CreateSessionPayload): Promise<Session> {
	const { username } = payload;
	const playerOwner: Player = await PlayerService.createPlayer({ username });
	const session: Session = await SessionDB.createSession({ owner: { playerId: playerOwner.id } });
	return session;
}
