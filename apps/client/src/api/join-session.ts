import { API_BASE_URL } from './config';
import type { Session } from '../models/session';
import { post, type Result } from './http-client';

interface JoinSessionRequestPayload {
	slug: string;
	username: string;
}

export function joinSession(payload: JoinSessionRequestPayload): Promise<Result<Session, string>> {
	const url = new URL(`/sessions/${payload.slug}/join`, API_BASE_URL).toString();
	return post<Session>({
		url,
		body: { username: payload.username },
	});
}
