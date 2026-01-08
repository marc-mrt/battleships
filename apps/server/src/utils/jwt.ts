import { createHmac, timingSafeEqual } from "node:crypto";

const ALGORITHM = "HS256";
const JWT_TYPE = "JWT";
const HMAC_ALGORITHM = "sha256";
const BASE64_URL_ENCODING = "base64url";
const UTF8_ENCODING = "utf8";
const JWT_PARTS_COUNT = 3;
const MILLISECONDS_TO_SECONDS = 1000;

interface JwtHeader {
  alg: string;
  typ: string;
}

interface JwtPayload {
  [key: string]: unknown;
  iat?: number;
}

interface SignJwtPayload {
  payload: JwtPayload;
  secret: string;
}

interface VerifyJwtPayload {
  token: string;
  secret: string;
}

interface VerifyJwtResult {
  valid: boolean;
  payload: JwtPayload | null;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString(BASE64_URL_ENCODING);
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, BASE64_URL_ENCODING).toString(UTF8_ENCODING);
}

function createSignature(message: string, secret: string): string {
  const hmac = createHmac(HMAC_ALGORITHM, secret);
  hmac.update(message);
  return base64UrlEncode(hmac.digest());
}

function createJwtHeader(): string {
  const header: JwtHeader = {
    alg: ALGORITHM,
    typ: JWT_TYPE,
  };
  return base64UrlEncode(Buffer.from(JSON.stringify(header)));
}

function createJwtPayload(payload: JwtPayload): string {
  const now = Math.floor(Date.now() / MILLISECONDS_TO_SECONDS);
  const jwtPayload: JwtPayload = {
    ...payload,
    iat: now,
  };

  return base64UrlEncode(Buffer.from(JSON.stringify(jwtPayload)));
}

export function signJwt(signPayload: SignJwtPayload): string {
  const { payload, secret } = signPayload;

  const header = createJwtHeader();
  const encodedPayload = createJwtPayload(payload);
  const message = `${header}.${encodedPayload}`;
  const signature = createSignature(message, secret);

  return `${message}.${signature}`;
}

function parseJwtParts(
  token: string,
): { header: string; payload: string; signature: string } | null {
  const parts = token.split(".");
  if (parts.length !== JWT_PARTS_COUNT) {
    return null;
  }

  const [header, payload, signature] = parts;
  return { header, payload, signature };
}

function verifySignature(
  message: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = createSignature(message, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

function parsePayload(encodedPayload: string): JwtPayload | null {
  try {
    const decoded = base64UrlDecode(encodedPayload);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyJwt(verifyPayload: VerifyJwtPayload): VerifyJwtResult {
  const { token, secret } = verifyPayload;

  const parts = parseJwtParts(token);
  if (!parts) {
    return { valid: false, payload: null };
  }

  const { header, payload: encodedPayload, signature } = parts;
  const message = `${header}.${encodedPayload}`;

  if (!verifySignature(message, signature, secret)) {
    return { valid: false, payload: null };
  }

  const payload = parsePayload(encodedPayload);
  if (!payload) {
    return { valid: false, payload: null };
  }

  return { valid: true, payload };
}
