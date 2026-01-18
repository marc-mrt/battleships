const ALGORITHM = "HS256";
const JWT_TYPE = "JWT";
const MILLISECONDS_TO_SECONDS = 1000;
const JWT_PARTS_COUNT = 3;

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

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
  const padded = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  return atob(padded);
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSignature(
  message: string,
  secret: string,
): Promise<string> {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    stringToArrayBuffer(message),
  );
  return base64UrlEncode(signature);
}

function createJwtHeader(): string {
  const header = { alg: ALGORITHM, typ: JWT_TYPE };
  return base64UrlEncode(stringToArrayBuffer(JSON.stringify(header)));
}

function createJwtPayload(payload: JwtPayload): string {
  const now = Math.floor(Date.now() / MILLISECONDS_TO_SECONDS);
  const jwtPayload: JwtPayload = { ...payload, iat: now };
  return base64UrlEncode(stringToArrayBuffer(JSON.stringify(jwtPayload)));
}

export async function signJwt(signPayload: SignJwtPayload): Promise<string> {
  const { payload, secret } = signPayload;

  const header = createJwtHeader();
  const encodedPayload = createJwtPayload(payload);
  const message = `${header}.${encodedPayload}`;
  const signature = await createSignature(message, secret);

  return `${message}.${signature}`;
}

interface JwtParts {
  header: string;
  payload: string;
  signature: string;
}

function parseJwtParts(token: string): JwtParts | null {
  const parts = token.split(".");
  if (parts.length !== JWT_PARTS_COUNT) {
    return null;
  }

  const [header, payload, signature] = parts;
  return { header, payload, signature };
}

async function verifySignature(
  message: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const key = await importKey(secret);

  const signatureArray = Uint8Array.from(base64UrlDecode(signature), (c) =>
    c.charCodeAt(0),
  );
  const signatureBytes = signatureArray.buffer as ArrayBuffer;

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    stringToArrayBuffer(message),
  );
}

function parsePayload(encodedPayload: string): JwtPayload | null {
  try {
    const decoded = base64UrlDecode(encodedPayload);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyJwt(
  verifyPayload: VerifyJwtPayload,
): Promise<VerifyJwtResult> {
  const { token, secret } = verifyPayload;

  const parts = parseJwtParts(token);
  if (!parts) {
    return { valid: false, payload: null };
  }

  const { header, payload: encodedPayload, signature } = parts;
  const message = `${header}.${encodedPayload}`;

  const isValid = await verifySignature(message, signature, secret);
  if (!isValid) {
    return { valid: false, payload: null };
  }

  const payload = parsePayload(encodedPayload);
  if (!payload) {
    return { valid: false, payload: null };
  }

  return { valid: true, payload };
}
