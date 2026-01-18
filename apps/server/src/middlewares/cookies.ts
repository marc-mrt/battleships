import { z } from "zod";
import { signJwt, verifyJwt } from "../utils/jwt";

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 24 * 60 * 60;

const SessionCookieSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
});

type SessionCookie = z.infer<typeof SessionCookieSchema>;

function isValidCookiePair(parts: string[]): parts is [string, string] {
  return parts.length === 2 && parts[0] !== "";
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(isValidCookiePair)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

function extractSessionCookie(
  cookies: Record<string, string>,
): string | undefined {
  return cookies[COOKIE_NAME];
}

function validateSessionCookie(payload: unknown): SessionCookie {
  return SessionCookieSchema.parse(payload);
}

function logParseError(error: unknown): void {
  console.error("Failed to parse session cookie:", error);
}

interface ParseSessionCookiePayload {
  cookieHeader: string | null | undefined;
  jwtSecret: string;
}

export async function parseSessionCookie(
  payload: ParseSessionCookiePayload,
): Promise<SessionCookie | null> {
  const { cookieHeader, jwtSecret } = payload;

  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookieHeader(cookieHeader);
  const token = extractSessionCookie(cookies);

  if (!token) {
    return null;
  }

  try {
    const result = await verifyJwt({ token, secret: jwtSecret });

    if (!result.valid || !result.payload) {
      return null;
    }

    return validateSessionCookie(result.payload);
  } catch (error) {
    logParseError(error);
    return null;
  }
}

interface CreateSessionCookiePayload {
  sessionId: string;
  playerId: string;
  jwtSecret: string;
  isProduction: boolean;
}

export async function createSessionCookie(
  payload: CreateSessionCookiePayload,
): Promise<string> {
  const { sessionId, playerId, jwtSecret, isProduction } = payload;

  const token = await signJwt({
    payload: { sessionId, playerId },
    secret: jwtSecret,
  });

  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

interface ClearSessionCookiePayload {
  isProduction: boolean;
}

export function createClearSessionCookie(
  payload: ClearSessionCookiePayload,
): string {
  const { isProduction } = payload;

  const parts = [
    `${COOKIE_NAME}=`,
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
