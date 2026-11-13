import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  isAuthConfigured,
  sessionCookieOptions,
  verifyPin,
  verifySessionToken,
} from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  const forwarded =
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

export async function GET() {
  const store = await cookies();
  return NextResponse.json({
    unlocked: verifySessionToken(store.get(SESSION_COOKIE)?.value),
  });
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "The server is missing APP_PIN or AUTH_SECRET." },
      { status: 503 },
    );
  }

  const key = clientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("pin" in body)) {
    return NextResponse.json({ error: "A PIN is required." }, { status: 400 });
  }

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (!/^\d{4,32}$/.test(pin)) {
    return NextResponse.json(
      { error: "Enter a numeric PIN." },
      { status: 400 },
    );
  }

  if (!verifyPin(pin)) {
    return NextResponse.json(
      { error: "That PIN doesn't match." },
      { status: 401 },
    );
  }

  attempts.delete(key);

  const remember = "remember" in body && body.remember === true;
  const token = createSessionToken(remember);
  if (!token) {
    return NextResponse.json(
      { error: "The session could not be created." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ unlocked: true });
  response.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(remember),
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ unlocked: false });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(false),
    maxAge: 0,
  });
  return response;
}
