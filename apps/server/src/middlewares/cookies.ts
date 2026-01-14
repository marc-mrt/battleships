import type { Response } from "express";
import { z } from "zod";
import { config } from "../config";
import { signJwt, verifyJwt } from "../utils/jwt";

const COOKIE_NAME = "session";
const MAX_AGE = 24 * 60 * 60 * 1000;

const SessionCookieSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
});

type SessionCookie = z.infer<typeof SessionCookieSchema>;

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  maxAge: number;
}

function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: MAX_AGE,
  };
}

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

export function parseSessionCookie(
  cookieHeader: string | undefined,
): SessionCookie | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookieHeader(cookieHeader);
  const token = extractSessionCookie(cookies);

  if (!token) {
    return null;
  }

  try {
    const result = verifyJwt({ token, secret: config.jwtSecret });

    if (!result.valid || !result.payload) {
      return null;
    }

    return validateSessionCookie(result.payload);
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

  const token = signJwt({
    payload: cookiePayload,
    secret: config.jwtSecret,
  });

  response.cookie(COOKIE_NAME, token, options);
}
