import { getApiURL } from './config';
import type { Session } from '../models/session';
import { get, type Result } from './http-client';

export function getSession(): Promise<Result<Session | null, string>> {
	const url = getApiURL('/sessions');
	return get<Session | null>(url);
}
