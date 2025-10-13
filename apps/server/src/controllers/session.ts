import { Request, Response } from 'express';
import { z } from 'zod';
import * as GameService from '../services/game';
import { BadRequestError } from './errors';
import { parseSessionCookie, setSessionCookie } from '../middlwares/cookies.ts';
import { getSessionByPlayerId } from '../database/session.ts';

const CreateSessionRequestBody = z.object({
	username: z.string(),
});

export async function createSession(request: Request, response: Response) {
	const result = CreateSessionRequestBody.safeParse(request.body);
	if (!result.success) {
		throw new BadRequestError(`Invalid request body: ${result.error.message}`);
	}

	const { username } = result.data;
	const session = await GameService.createSession({ username });

	setSessionCookie(response, {
		sessionId: session.id,
		playerId: session.owner.id,
	});

	return response.status(201).send(session);
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
	const session = await GameService.joinSession({ slug, username });

	setSessionCookie(response, {
		sessionId: session.id,
		playerId: session.friend!.id,
	});

	return response.status(200).send(session);
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
	return response.status(200).send(session);
}
