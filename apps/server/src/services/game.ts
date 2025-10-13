import * as SessionDB from '../database/session';
import { Session } from '../models/session';
import { Player } from '../models/player';
import { sendFriendJoinedMessage, sendReadyToPlayMessage } from '../controllers/websocket';
import * as PlayerDB from '../database/player';
import * as BoatPlacementDB from '../database/boat-placement';
import { NotFoundError } from '../controllers/errors.ts';

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

export async function joinSession(payload: JoinSessionPayload): Promise<Session> {
	const { slug, username } = payload;

	const player: Player = await createPlayer({ username });
	const session: Session = await SessionDB.assignFriendToSession({
		slug,
		friend: { playerId: player.id },
	});

	sendFriendJoinedMessage(session.owner.id, {
		session: {
			// @NOTE(marc-mrt): No other state is possible at this point.
			status: session.status as 'waiting_for_boat_placements',
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

interface SaveBoatPlacementsPayload {
	playerId: string;
	boats: Array<{
		id: string;
		startX: number;
		startY: number;
		length: number;
		orientation: 'horizontal' | 'vertical';
	}>;
}

export async function saveBoatPlacements(payload: SaveBoatPlacementsPayload): Promise<void> {
	const { playerId } = payload;

	const { boats } = payload;
	await BoatPlacementDB.saveBoatPlacements({
		playerId,
		boats,
	});

	const session = await getSessionByPlayerId(playerId);
	if (session.status === 'ready_to_play') {
		sendReadyToPlayMessage(session.owner.id, { session });
		sendReadyToPlayMessage(session.friend.id, { session });
	}
}
