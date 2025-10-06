import { API_BASE_URL } from './config';
import type { Session } from '../models/session';

interface JoinSessionRequestPayload {
	sessionId: string;
	username: string;
}

export async function joinSession(payload: JoinSessionRequestPayload): Promise<Session> {
	const { sessionId, username } = payload;
	const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/join`, {
		method: 'POST',
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
