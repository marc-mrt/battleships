import { API_BASE_URL } from './config';
import type { Session } from '../models/session';
import { post, type Result } from './http-client';

interface CreateSessionRequestPayload {
	username: string;
}

export function createSession(
	payload: CreateSessionRequestPayload,
): Promise<Result<Session, string>> {
	const url = new URL('/sessions', API_BASE_URL).toString();
	return post<Session>({ url, body: payload });
}
