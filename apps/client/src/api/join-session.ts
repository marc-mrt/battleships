import { getApiURL } from './config';
import type { Session } from '../models/session';
import { post, type Result } from './http-client';

interface JoinSessionRequestPayload {
	slug: string;
	username: string;
}

export function joinSession(payload: JoinSessionRequestPayload): Promise<Result<Session, string>> {
	const url = getApiURL(`/sessions/${payload.slug}/join`);
	return post<Session>({
		url,
		body: { username: payload.username },
	});
}
