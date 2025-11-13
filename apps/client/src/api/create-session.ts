import { API_BASE_URL } from './config';
import type { Session } from '../models/session';
import { post, type Result } from './http-client';

interface CreateSessionRequestPayload {
	username: string;
}

export function createSession(
	payload: CreateSessionRequestPayload,
): Promise<Result<Session, string>> {
	return post<Session>({ url: `${API_BASE_URL}/sessions`, body: payload });
}
