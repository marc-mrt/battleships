import * as SessionDB from '../database/session.ts';
import { Session, SessionWaitingForBoats } from '../models/session.ts';
import { Player } from '../models/player.ts';
import { sendFriendJoinedMessage } from '../controllers/websocket.ts';
import { NotFoundError } from '../controllers/errors.ts';
import { Coordinates } from '../models/shot.ts';
import * as GameStateManager from './game-state-manager.ts';
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

	sendFriendJoinedMessage(session.owner.id, {
		session: {
			status: 'waiting_for_boat_placements',
		},
		friend: {
			playerId: player.id,
			username: player.username,
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

interface SaveBoatsPayload {
	playerId: string;
	boats: Array<{
		id: string;
		startX: number;
		startY: number;
		length: number;
		orientation: 'horizontal' | 'vertical';
	}>;
}

export async function saveBoats(payload: SaveBoatsPayload): Promise<void> {
	const { playerId, boats } = payload;
	await GameStateManager.saveBoatsAndCheckGameStart({
		playerId,
		boats,
	});

	const session: Session = await getSessionByPlayerId(playerId);
	if (session.status === 'ready_to_start') {
		await GameStateManager.startGame({
			sessionId: session.id,
			ownerId: session.owner.id,
			friendId: session.friend!.id,
		});
	}
}

interface ProcessShotPayload {
	playerId: string;
	x: number;
	y: number;
}

export async function handleShotFired(payload: ProcessShotPayload): Promise<void> {
	const session = await getSessionByPlayerId(payload.playerId);
	const playerId = payload.playerId;
	const coordinates: Coordinates = { x: payload.x, y: payload.y };
	await GameStateManager.handleShotFired({ session, playerId, coordinates });
}

export async function requestNewGame(playerId: string): Promise<SessionWaitingForBoats> {
	const session = await getSessionByPlayerId(playerId);

	if (session.owner.id !== playerId) {
		throw new NotFoundError('Only the session owner can request a new game');
	}

	return await SessionDB.resetSessionToBoatPlacement(session.id);
}
