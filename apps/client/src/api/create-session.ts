import { API_BASE_URL } from './config';
import type { Session } from '../models/session';

interface CreateSessionRequestPayload {
	username: string;
}

export async function createSession(payload: CreateSessionRequestPayload): Promise<Session> {
	const response = await fetch(`${API_BASE_URL}/sessions`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Failed to create session: ${response.statusText}`);
	}

	return response.json();
}
