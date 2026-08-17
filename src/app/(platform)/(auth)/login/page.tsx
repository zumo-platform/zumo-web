import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isMarketingSiteHost, resolvedPlatformAppOrigin } from "@/lib/platform-url";

type LoginRedirectProps = Readonly<{
  searchParams: Promise<{ tab?: string }>;
}>;

/** Bare `/login` defaults to Spanish-first auth (`/es/login`). */
export default async function LegacyLoginRedirect({ searchParams }: LoginRedirectProps) {
  const { tab } = await searchParams;
  const suffix = tab === "signup" ? "?tab=signup" : "";
  const host = (await headers()).get("host") ?? "";
  const loginPath = `/es/login${suffix}`;
  if (isMarketingSiteHost(host)) {
    redirect(`${resolvedPlatformAppOrigin()}${loginPath}`);
  }
  redirect(loginPath);
}
