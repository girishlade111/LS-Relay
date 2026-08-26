import "server-only";
import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

// OAuth CSRF protection. The old scheme put the Clerk user id in `state`,
// which is predictable — an attacker could complete an OAuth grant on their
// own account and then hand the victim the callback URL; with a matching
// (guessed) state the attacker's token would be linked to the victim's
// account. A cryptographically random nonce, stored in a short-lived
// httpOnly cookie and compared at the callback, closes that hole: only the
// browser that started the flow can finish it.

const NONCE_BYTES = 24;
const STATE_MAX_AGE_SECONDS = 600;

function cookieName(provider: string): string {
  const safe = provider.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `oauth_state_${safe}`;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function createOAuthState(): string {
  return randomBytes(NONCE_BYTES).toString("hex");
}

export function bindOAuthState(
  response: NextResponse,
  provider: string,
  nonce: string
): void {
  response.cookies.set({
    name: cookieName(provider),
    value: nonce,
    ...cookieOptions(STATE_MAX_AGE_SECONDS),
  });
}

export function clearOAuthState(response: NextResponse, provider: string): void {
  response.cookies.set({
    name: cookieName(provider),
    value: "",
    ...cookieOptions(0),
  });
}

// Shared guard for every callback route: the query `state` must match the
// nonce issued during /connect in this exact browser session.
export function isOAuthStateValid(
  request: NextRequest,
  provider: string
): boolean {
  const expected = request.cookies.get(cookieName(provider))?.value;
  const received = request.nextUrl.searchParams.get("state");

  if (!expected || !received || expected.length !== received.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return mismatch === 0;
}
