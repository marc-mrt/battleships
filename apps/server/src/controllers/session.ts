import { Request, Response } from 'express';
import { z } from 'zod';
import * as SessionService from '../services/session';
import { BadRequestError } from './errors';

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

	const { sessionId } = request.params;
	const { username } = result.data;
	const session = await SessionService.joinSession({ sessionId, username });
	return response.status(200).send(session);
}
