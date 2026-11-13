import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "journal_session";

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;

function secret(): string | null {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV !== "production") return process.env.APP_PIN ?? null;
  return null;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PIN && secret());
}

export function verifyPin(input: string): boolean {
  const expected = process.env.APP_PIN;
  if (!expected) return false;

  const provided = createHash("sha256").update(input, "utf8").digest();
  const stored = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(provided, stored);
}

function sign(expiresAt: number): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key)
    .update(`journal-session:${expiresAt}`)
    .digest("base64url");
}

export function createSessionToken(remember: boolean): string | null {
  const ttl = remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS;
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const signature = sign(expiresAt);
  if (!signature) return null;
  return `${expiresAt}.${signature}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const [rawExpiry, signature] = token.split(".");
  if (!rawExpiry || !signature) return false;

  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = sign(expiresAt);
  if (!expected) return false;

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function sessionCookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_TTL_SECONDS } : {}),
  };
}
