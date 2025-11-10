import { API_BASE_URL } from './config';
import type { Session } from '../models/session';
import { post, type Result } from './http-client';

interface JoinSessionRequestPayload {
	slug: string;
	username: string;
}

export function joinSession(payload: JoinSessionRequestPayload): Promise<Result<Session, string>> {
	return post<Session>(`${API_BASE_URL}/sessions/${payload.slug}/join`, {
		username: payload.username,
	});
}
