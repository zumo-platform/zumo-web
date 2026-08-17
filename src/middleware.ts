import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  isMarketingContentPath,
  isMarketingSiteHost,
  isPlatformAppHost,
  isPlatformAppPath,
  marketingSiteOrigin,
  resolvedPlatformAppOrigin,
} from "@/lib/platform-url";

const PROTECTED_PREFIXES = [
  "/inbox",
  "/whatsapp",
  "/orders",
  "/clients",
  "/products",
  "/profile",
];

function redirectTo(origin: string, pathname: string, search: string): NextResponse {
  const url = new URL(pathname + search, origin);
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const platformOrigin = resolvedPlatformAppOrigin();
  const marketingOrigin = marketingSiteOrigin();

  // Marketing domain (zumob2b.com / www on Vercel) → auth + dashboard on app.zumob2b.com
  if (isMarketingSiteHost(host) && isPlatformAppPath(pathname)) {
    return redirectTo(platformOrigin, pathname, search);
  }

  // Platform domain (app.zumob2b.com on AWS) → marketing pages on zumob2b.com
  if (isPlatformAppHost(host) && isMarketingContentPath(pathname)) {
    const targetPath = pathname === "/" ? "/es" : pathname;
    return redirectTo(marketingOrigin, targetPath, search);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const idToken = request.cookies.get("zumo_id_token")?.value;

  if (!idToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
