import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import type { AuthTokens } from "./cognito-server";

const COOKIE_ID_TOKEN = "zumo_id_token";
const COOKIE_ACCESS_TOKEN = "zumo_access_token";
const COOKIE_REFRESH_TOKEN = "zumo_refresh_token";

const BASE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setAuthSession(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_ID_TOKEN, tokens.idToken, {
    ...BASE_OPTIONS,
    maxAge: tokens.expiresIn,
  });
  store.set(COOKIE_ACCESS_TOKEN, tokens.accessToken, {
    ...BASE_OPTIONS,
    maxAge: tokens.expiresIn,
  });
  store.set(COOKIE_REFRESH_TOKEN, tokens.refreshToken, {
    ...BASE_OPTIONS,
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Ensure refreshed tokens are returned on the Route Handler response. */
export function applyAuthSessionToResponse(
  response: NextResponse,
  tokens: AuthTokens,
): void {
  response.cookies.set(COOKIE_ID_TOKEN, tokens.idToken, {
    ...BASE_OPTIONS,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(COOKIE_ACCESS_TOKEN, tokens.accessToken, {
    ...BASE_OPTIONS,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(COOKIE_REFRESH_TOKEN, tokens.refreshToken, {
    ...BASE_OPTIONS,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getAuthSession(): Promise<{
  idToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const store = await cookies();
  return {
    idToken: store.get(COOKIE_ID_TOKEN)?.value ?? null,
    accessToken: store.get(COOKIE_ACCESS_TOKEN)?.value ?? null,
    refreshToken: store.get(COOKIE_REFRESH_TOKEN)?.value ?? null,
  };
}

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Parse Zumo auth cookies from the raw `Cookie` header (fallback when `cookies()`
 * does not expose values in some Route Handler edge cases).
 */
export function parseZumoAuthFromCookieHeader(cookieHeader: string | null): {
  idToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
} {
  const empty = { idToken: null, accessToken: null, refreshToken: null } as const;
  if (!cookieHeader?.trim()) {
    return { ...empty };
  }
  let idToken: string | null = null;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  for (const segment of cookieHeader.split(";")) {
    const i = segment.indexOf("=");
    if (i === -1) continue;
    const name = segment.slice(0, i).trim();
    const rawVal = segment.slice(i + 1).trim();
    const val = decodeCookieValue(rawVal);
    if (!val) continue;
    if (name === COOKIE_ID_TOKEN) idToken = val;
    else if (name === COOKIE_ACCESS_TOKEN) accessToken = val;
    else if (name === COOKIE_REFRESH_TOKEN) refreshToken = val;
  }
  return { idToken, accessToken, refreshToken };
}

/** Merge `Cookie` header with `cookies()` so API proxy always sees browser-sent tokens. */
export async function getAuthSessionForProxy(request: Request): Promise<{
  idToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const fromStore = await getAuthSession();
  const fromHeader = parseZumoAuthFromCookieHeader(request.headers.get("cookie"));
  return {
    idToken: fromHeader.idToken ?? fromStore.idToken,
    accessToken: fromHeader.accessToken ?? fromStore.accessToken,
    refreshToken: fromHeader.refreshToken ?? fromStore.refreshToken,
  };
}

export async function clearAuthSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_ID_TOKEN);
  store.delete(COOKIE_ACCESS_TOKEN);
  store.delete(COOKIE_REFRESH_TOKEN);
}
