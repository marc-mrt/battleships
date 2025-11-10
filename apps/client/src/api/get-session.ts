import { API_BASE_URL } from './config';
import type { Session } from '../models/session';
import { get, type Result } from './http-client';

export function getSession(): Promise<Result<Session | null, string>> {
	return get<Session | null>(`${API_BASE_URL}/sessions`);
}
