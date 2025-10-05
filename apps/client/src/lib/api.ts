export interface Player {
	id: string;
	username: string;
}

export interface Session {
	id: string;
	owner: Player;
	friend: Player | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function createSession(username: string): Promise<Session> {
	const response = await fetch(`${API_BASE_URL}/sessions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ username }),
	});

	if (!response.ok) {
		throw new Error(`Failed to create session: ${response.statusText}`);
	}

	return response.json();
}
