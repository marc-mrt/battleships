import * as SessionDB from '../database/session.ts';
import {
	isSessionPlaying,
	Session,
	SessionGameOver,
	SessionPlaying,
	SessionWaitingForBoats,
} from '../models/session.ts';
import { Player } from '../models/player.ts';
import { sendOpponentJoinedMessage } from '../controllers/websocket.ts';
import { BadRequestError, NotFoundError } from '../controllers/errors.ts';
import * as PlayerService from './player.ts';

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
	slug: string;
	username: string;
}

export async function joinSession(payload: JoinSessionPayload): Promise<SessionWaitingForBoats> {
	const { slug, username } = payload;

	const player: Player = await PlayerService.createPlayer({ username });
	const session: SessionWaitingForBoats = await SessionDB.assignFriendToSession({
		slug,
		friend: { playerId: player.id },
	});

	sendOpponentJoinedMessage(session.owner.id, {
		session: {
			status: session.status,
		},
		opponent: {
			id: player.id,
			username: player.username,
			isOwner: false,
		},
	});

	return session;
}

export async function getSessionByPlayerId(playerId: string): Promise<Session> {
	const session: Session | null = await SessionDB.getSessionByPlayerId(playerId);
	if (!session) {
		throw new NotFoundError(`Session not found for player with ID: ${playerId}`);
	}

	return session;
}

export async function setCurrentTurn(sessionId: string, playerId: string): Promise<SessionPlaying> {
	const session: SessionPlaying = await SessionDB.setCurrentTurn({
		sessionId,
		playerId,
	});

	return session;
}

export async function setWinner(sessionId: string, winnerId: string): Promise<SessionGameOver> {
	const session: SessionGameOver = await SessionDB.setWinner({
		sessionId,
		winnerId,
	});

	return session;
}

export async function resetSessionForPlayer(playerId: string): Promise<SessionWaitingForBoats> {
	const session: Session = await getSessionByPlayerId(playerId);

	if (session.owner.id !== playerId) {
		throw new BadRequestError('Only the session owner can request a new game');
	}

	if (isSessionPlaying(session)) {
		throw new BadRequestError('Session is still in progress');
	}

	const updatedSession: SessionWaitingForBoats = await SessionDB.resetSessionToBoatPlacement(
		session.id,
	);
	return updatedSession;
}
