import { API_BASE_URL } from './config';
import type { Session } from '../models/session';

interface JoinSessionRequestPayload {
	slug: string;
	username: string;
}

export async function joinSession(payload: JoinSessionRequestPayload): Promise<Session> {
	const { slug, username } = payload;
	const response = await fetch(`${API_BASE_URL}/sessions/${slug}/join`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			username,
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to join session: ${response.statusText}`);
	}

	return response.json();
}
