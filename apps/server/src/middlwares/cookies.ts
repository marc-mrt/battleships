import { z } from 'zod';
import { Response } from 'express';

const COOKIE_NAME = 'session';
const MAX_AGE = 24 * 60 * 60 * 1000;

export const SessionCookieSchema = z.object({
	sessionId: z.string(),
	playerId: z.string(),
});

export type SessionCookie = z.infer<typeof SessionCookieSchema>;

function parseCookieString(acc: Record<string, string>, cookie: string): Record<string, string> {
	const [key, value] = cookie.trim().split('=');
	if (key && value) {
		acc[key] = decodeURIComponent(value);
	}
	return acc;
}

export function parseSessionCookie(cookieHeader: string | undefined): SessionCookie | null {
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(';').reduce(parseCookieString, {} as Record<string, string>);

	try {
		const cookie: string | undefined = cookies[COOKIE_NAME];
		if (!cookie) return null;

		const json: unknown = JSON.parse(cookies[COOKIE_NAME]);
		return SessionCookieSchema.parse(json);
	} catch (e) {
		console.error('Failed to parse session cookie:', e);
		return null;
	}
}

export function setSessionCookie(response: Response, payload: SessionCookie) {
	response.cookie(COOKIE_NAME, JSON.stringify(payload), {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: MAX_AGE,
	});
}
