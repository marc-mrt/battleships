import * as SessionDB from '../database/session';
import { Session } from '../models/session';
import { Player } from '../models/player';
import * as PlayerService from './player';
import { sendFriendJoinedMessage } from '../controllers/websocket';

interface CreateSessionPayload {
	username: string;
}
export async function createSession(payload: CreateSessionPayload): Promise<Session> {
	const { username } = payload;
	const playerOwner: Player = await PlayerService.createPlayer({ username });
	const session: Session = await SessionDB.createSession({ owner: { playerId: playerOwner.id } });
	return session;
}

interface JoinSessionPayload {
	sessionId: string;
	username: string;
}
export async function joinSession(payload: JoinSessionPayload): Promise<Session> {
	const { sessionId, username } = payload;
	const player: Player = await PlayerService.createPlayer({ username });
	const session: Session = await SessionDB.assignFriendToSession({
		sessionId,
		friend: { playerId: player.id },
	});
	sendFriendJoinedMessage(session.owner.id, {
		session: {
			status: 'all_players_joined',
		},
		friend: {
			playerId: player.id,
			username: player.username,
		},
	});
	return session;
}
