import { Request, Response } from 'express';
import { z } from 'zod';
import * as SessionService from '../services/session.ts';
import { BadRequestError } from './errors';
import { parseSessionCookie, setSessionCookie } from '../middlwares/cookies.ts';
import { getSessionByPlayerId } from '../database/session.ts';
import { Session, SessionStatus, SessionWaitingForBoats } from '../models/session.ts';

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

	setSessionCookie(response, {
		sessionId: session.id,
		playerId: session.owner.id,
	});

	const mapped = mapToSessionResponse(session);
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

	setSessionCookie(response, {
		sessionId: session.id,
		playerId: session.friend.id,
	});

	const mapped = mapToSessionResponse(session);
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
	const mapped = mapToSessionResponse(session);
	return response.status(200).send(mapped);
}

interface SessionResponse {
	slug: string;
	status: SessionStatus;
	owner: {
		id: string;
		username: string;
	};
	friend: {
		id: string;
		username: string;
	} | null;
}

function mapToSessionResponse(session: Session): SessionResponse {
	return {
		slug: session.slug,
		status: session.status,
		owner: {
			id: session.owner.id,
			username: session.owner.username,
		},
		friend:
			session.status !== 'waiting_for_friend'
				? {
						id: session.friend.id,
						username: session.friend.username,
					}
				: null,
	};
}
