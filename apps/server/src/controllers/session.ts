import { Request, Response } from 'express';
import { z } from 'zod';
import * as SessionService from '../services/session';
import { BadRequestError } from './errors';
import { parseSessionCookie, setSessionCookie } from '../middlwares/cookies';
import { getSessionByPlayerId } from '../database/session';
import { Session, SessionPlaying, SessionStatus, SessionWaitingForBoats } from '../models/session';

const CreateSessionRequestBody = z.object({
	username: z.string(),
});

export async function createSession(request: Request, response: Response) {
	const result = CreateSessionRequestBody.safeParse(request.body);
	if (!result.success) {
		throw new BadRequestError(`Invalid request body: ${result.error.message}`);
	}

	const { username } = result.data;
	const session = await SessionService.createSession({ username });

	setSessionCookie({
		response,
		payload: {
			sessionId: session.id,
			playerId: session.owner.id,
		},
	});

	const mapped = mapToSessionResponse(session, session.owner);
	return response.status(201).send(mapped);
}

const JoinSessionRequestBody = z.object({
	username: z.string(),
});

export async function joinSession(request: Request, response: Response) {
	const result = JoinSessionRequestBody.safeParse(request.body);
	if (!result.success) {
		throw new BadRequestError(`Invalid request body: ${result.error.message}`);
	}

	const { slug } = request.params;
	const { username } = result.data;
	const session: SessionWaitingForBoats = await SessionService.joinSession({ slug, username });

	setSessionCookie({
		response,
		payload: {
			sessionId: session.id,
			playerId: session.friend.id,
		},
	});

	const mapped = mapToSessionResponse(session, session.friend);
	return response.status(200).send(mapped);
}

export async function getCurrentSession(request: Request, response: Response) {
	const cookieHeader = request.headers.cookie;
	const sessionCookie = parseSessionCookie(cookieHeader);
	if (!sessionCookie) {
		return response.status(204).send();
	}

	const session = await getSessionByPlayerId(sessionCookie.playerId);
	if (!session) {
		return response.status(204).send();
	}
	const mapped = mapToSessionResponse(
		session,
		sessionCookie.playerId === session.owner.id
			? session.owner
			: (session as SessionPlaying).friend,
	);
	return response.status(200).send(mapped);
}

interface PlayerResponse {
	id: string;
	username: string;
	isOwner: boolean;
}

interface SessionResponse {
	slug: string;
	status: SessionStatus;
	player: PlayerResponse;
	opponent: PlayerResponse | null;
}

function mapToSessionResponse(
	session: Session,
	player: Pick<PlayerResponse, 'id' | 'username'>,
): SessionResponse {
	let opponent: PlayerResponse | null = null;

	if (player.id === session.owner.id) {
		opponent =
			session.status === 'waiting_for_boat_placements' || session.status === 'playing'
				? {
						id: session.friend.id,
						username: session.friend.username,
						isOwner: false,
					}
				: null;
	} else {
		opponent = {
			id: session.owner.id,
			username: session.owner.username,
			isOwner: true,
		};
	}

	return {
		slug: session.slug,
		status: session.status,
		player: {
			...player,
			isOwner: player.id === session.owner.id,
		},
		opponent,
	};
}
