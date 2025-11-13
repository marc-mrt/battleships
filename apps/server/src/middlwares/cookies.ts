import { z } from 'zod';
import { Response } from 'express';

const COOKIE_NAME = 'session';
const MAX_AGE = 24 * 60 * 60 * 1000;

export const SessionCookieSchema = z.object({
	sessionId: z.string(),
	playerId: z.string(),
});

export type SessionCookie = z.infer<typeof SessionCookieSchema>;

interface CookieOptions {
	httpOnly: boolean;
	secure: boolean;
	sameSite: 'strict' | 'lax' | 'none';
	maxAge: number;
}

function getCookieOptions(): CookieOptions {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: MAX_AGE,
	};
}

function parseCookieString(acc: Record<string, string>, cookie: string): Record<string, string> {
	const [key, value] = cookie.trim().split('=');
	if (key && value) {
		acc[key] = decodeURIComponent(value);
	}
	return acc;
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
	return cookieHeader.split(';').reduce(parseCookieString, {} as Record<string, string>);
}

function extractSessionCookie(cookies: Record<string, string>): string | undefined {
	return cookies[COOKIE_NAME];
}

function parseJsonCookie(cookie: string): unknown {
	return JSON.parse(cookie);
}

function validateSessionCookie(json: unknown): SessionCookie {
	return SessionCookieSchema.parse(json);
}

function logParseError(error: unknown): void {
	console.error('Failed to parse session cookie:', error);
}

export function parseSessionCookie(cookieHeader: string | undefined): SessionCookie | null {
	if (!cookieHeader) {
		return null;
	}

	const cookies = parseCookieHeader(cookieHeader);
	const cookie = extractSessionCookie(cookies);

	if (!cookie) {
		return null;
	}

	try {
		const json = parseJsonCookie(cookie);
		return validateSessionCookie(json);
	} catch (error) {
		logParseError(error);
		return null;
	}
}

interface SetSessionCookiePayload {
	response: Response;
	payload: SessionCookie;
}

export function setSessionCookie(payload: SetSessionCookiePayload): void {
	const { response, payload: cookiePayload } = payload;
	const options = getCookieOptions();
	const value = JSON.stringify(cookiePayload);
	response.cookie(COOKIE_NAME, value, options);
}
