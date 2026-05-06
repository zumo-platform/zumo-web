import { cookies } from "next/headers";

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

export async function clearAuthSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_ID_TOKEN);
  store.delete(COOKIE_ACCESS_TOKEN);
  store.delete(COOKIE_REFRESH_TOKEN);
}
