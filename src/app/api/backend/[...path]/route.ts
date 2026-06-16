import { NextResponse } from "next/server";

import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import { refreshAuthSession, type AuthTokens } from "@/lib/cognito-server";
import {
  applyAuthSessionToResponse,
  getAuthSessionForProxy,
  setAuthSession,
} from "@/lib/session";

export const runtime = "nodejs";

const CACHEABLE_DASHBOARD_GET_PATHS = new Set([
  "dashboard/orders",
  "dashboard/customers",
  "dashboard/products",
  "dashboard/warehouses",
  "dashboard/product-categories",
  "dashboard/order-status-flow",
]);

function coercePathSegments(routePath: unknown): string[] {
  if (Array.isArray(routePath)) {
    return routePath
      .flatMap((segment) =>
        typeof segment === "string" ? segment.split("/") : String(segment ?? "").split("/"),
      )
      .filter(Boolean);
  }
  if (typeof routePath === "string" && routePath.length > 0) {
    return routePath.split("/").filter(Boolean);
  }
  return [];
}

function isCacheableDashboardGet(method: string, segments: readonly string[]): boolean {
  if (method !== "GET") return false;
  return CACHEABLE_DASHBOARD_GET_PATHS.has(segments.join("/"));
}

async function proxyRequest(
  request: Request,
  segments: string[],
): Promise<NextResponse> {
  let { idToken, accessToken, refreshToken } = await getAuthSessionForProxy(request);
  let refreshedTokens: AuthTokens | null = null;

  /** Id/access cookies use Cognito `expiresIn` (~1h); refresh lasts 30d. Refresh here so POSTs keep working. */
  if (
    (!idToken || !accessToken) &&
    typeof refreshToken === "string" &&
    refreshToken.length > 0
  ) {
    try {
      refreshedTokens = await refreshAuthSession(refreshToken);
      await setAuthSession(refreshedTokens);
      idToken = refreshedTokens.idToken;
      accessToken = refreshedTokens.accessToken;
    } catch (err) {
      console.error("[api/backend] Cognito refresh failed", err);
    }
  }

  /** Prefer id_token (tenant claims); retry with access_token if the gateway rejects the first. */
  const pathStr = segments.join("/");
  const preferAccessToken = pathStr === "sellers/me/password";
  const bearerCandidates = [
    ...new Set(
      preferAccessToken
        ? [accessToken, idToken].filter((t): t is string => Boolean(t))
        : [idToken, accessToken].filter((t): t is string => Boolean(t)),
    ),
  ];

  if (bearerCandidates.length === 0) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message:
          "No active session. Iniciá sesión de nuevo o esperá unos segundos si acabás de entrar.",
      },
      { status: 401 },
    );
  }

  const baseUrl = getServerApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error: "MissingAPIUrl",
        message:
          "Falta API_URL o NEXT_PUBLIC_API_URL en .env.local apuntando a la URL base del API Gateway (sin slash final ni sufijo …/dashboard).",
      },
      { status: 503 },
    );
  }

  if (segments.length === 0) {
    return NextResponse.json(
      { error: "BadRequest", message: "Falta el path tras /api/backend/." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const upstream = `${joinApiGatewayPath(baseUrl, pathStr)}${qs ? `?${qs}` : ""}`;

  let forwardedBody: string | undefined;
  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    try {
      const body = await request.text();
      if (body.length > 0) forwardedBody = body;
    } catch {
      // no body
    }
  }

  let upstream_res: Response;
  let text = "";
  const upstreamStarted = Date.now();

  try {
    const upstreamFetch = (bearer: string) =>
      fetch(upstream, {
        method: request.method,
        headers:
          forwardedBody !== undefined
            ? {
                Authorization: `Bearer ${bearer}`,
                "Content-Type": "application/json",
              }
            : { Authorization: `Bearer ${bearer}` },
        ...(forwardedBody !== undefined ? { body: forwardedBody } : {}),
      });

    upstream_res = await upstreamFetch(bearerCandidates[0]);
    text = await upstream_res.text();

    for (let i = 1; i < bearerCandidates.length; i++) {
      if (upstream_res.status !== 401 && upstream_res.status !== 403) {
        break;
      }
      upstream_res = await upstreamFetch(bearerCandidates[i]);
      text = await upstream_res.text();
    }
  } catch {
    return NextResponse.json(
      {
        error: "UpstreamUnavailable",
        message:
          "No se pudo conectar con el API. Comprueba API_URL y la red/VPN.",
      },
      { status: 502 },
    );
  }

  const upstreamMs = Date.now() - upstreamStarted;

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  const res = NextResponse.json(body, { status: upstream_res.status });
  if (refreshedTokens) {
    applyAuthSessionToResponse(res, refreshedTokens);
  }
  if (isCacheableDashboardGet(request.method, segments) && upstream_res.ok) {
    res.headers.set("Cache-Control", "private, max-age=5, stale-while-revalidate=30");
  }
  if (process.env.NODE_ENV === "development") {
    res.headers.set("x-zumo-proxy-upstream", upstream);
    res.headers.set("x-zumo-proxy-upstream-ms", String(upstreamMs));
  }
  return res;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path?: string[] | string }> },
) {
  const { path } = await ctx.params;
  return proxyRequest(request, coercePathSegments(path));
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ path?: string[] | string }> },
) {
  const { path } = await ctx.params;
  return proxyRequest(request, coercePathSegments(path));
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ path?: string[] | string }> },
) {
  const { path } = await ctx.params;
  return proxyRequest(request, coercePathSegments(path));
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ path?: string[] | string }> },
) {
  const { path } = await ctx.params;
  return proxyRequest(request, coercePathSegments(path));
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ path?: string[] | string }> },
) {
  const { path } = await ctx.params;
  return proxyRequest(request, coercePathSegments(path));
}
