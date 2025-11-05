import * as SessionDB from '../database/session.ts';
import { Session, SessionInGame, SessionWaitingForBoats } from '../models/session.ts';
import { Player } from '../models/player.ts';
import { sendFriendJoinedMessage } from '../controllers/websocket.ts';
import * as PlayerDB from '../database/player.ts';
import * as BoatDB from '../database/boat.ts';
import { NotFoundError } from '../controllers/errors.ts';
import { Coordinates } from '../models/shot.ts';
import { GameStateManager } from './game-state-manager.ts';

interface CreateSessionPayload {
	username: string;
}

export async function createSession(payload: CreateSessionPayload): Promise<Session> {
	const { username } = payload;
	const playerOwner: Player = await createPlayer({ username });
	const session: Session = await SessionDB.createSession({ owner: { playerId: playerOwner.id } });
	return session;
}

interface JoinSessionPayload {
	slug: string;
	username: string;
}

export async function joinSession(payload: JoinSessionPayload): Promise<SessionWaitingForBoats> {
	const { slug, username } = payload;

	const player: Player = await createPlayer({ username });
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

interface CreatePlayerPayload {
	username: string;
}

export async function createPlayer(payload: CreatePlayerPayload): Promise<Player> {
	const { username } = payload;
	const player: Player = await PlayerDB.createPlayer({ username });
	return player;
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
	await BoatDB.saveBoats({
		playerId,
		boats,
	});

	const session: Session = await getSessionByPlayerId(playerId);
	if (session.status === 'ready_to_start') {
		const firstPlayerId = Math.random() < 0.5 ? session.owner.id : session.friend!.id;

		const updatedSession: SessionInGame = await SessionDB.setCurrentTurn({
			sessionId: session.id,
			playerId: firstPlayerId,
		});

		const gameManager = new GameStateManager(updatedSession);
		gameManager.broadcastNextTurn(firstPlayerId);
	}
}

interface ProcessShotPayload {
	playerId: string;
	x: number;
	y: number;
}

export async function handleShotFired(payload: ProcessShotPayload): Promise<void> {
	const session = await getSessionByPlayerId(payload.playerId);
	const gameManager = new GameStateManager(session);

	const playerId = payload.playerId;
	const coordinates: Coordinates = { x: payload.x, y: payload.y };
	await gameManager.handleShotFired(playerId, coordinates);
}
