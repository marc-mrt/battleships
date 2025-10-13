import { API_BASE_URL } from './config';
import type { Session } from '../models/session';

export async function getSession(): Promise<Session | null> {
	const response = await fetch(`${API_BASE_URL}/sessions`, {
		method: 'GET',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to get session: ${response.statusText}`);
	}

	if (response.status === 200) {
		return response.json();
	} else {
		return null;
	}
}
