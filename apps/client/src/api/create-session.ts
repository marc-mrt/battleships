import { getApiURL } from './config';
import type { Session } from '../models/session';
import { post, type Result } from './http-client';

interface CreateSessionRequestPayload {
	username: string;
}

export function createSession(
	payload: CreateSessionRequestPayload,
): Promise<Result<Session, string>> {
	const url = getApiURL('/sessions');
	return post<Session>({ url, body: payload });
}
