import { NextResponse } from "next/server";

import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import { getAuthSession } from "@/lib/session";

export const runtime = "nodejs";

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

async function proxyRequest(
  request: Request,
  segments: string[],
): Promise<NextResponse> {
  const { accessToken, idToken } = await getAuthSession();
  /** Prefer id_token (tenant claims); retry with access_token if the gateway rejects the first. */
  const bearerCandidates = [...new Set([idToken, accessToken].filter((t): t is string => Boolean(t)))];

  if (bearerCandidates.length === 0) {
    return NextResponse.json(
      { error: "Unauthorized", message: "No active session." },
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

  const pathStr = segments.join("/");
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

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  const res = NextResponse.json(body, { status: upstream_res.status });
  if (process.env.NODE_ENV === "development") {
    res.headers.set("x-zumo-proxy-upstream", upstream);
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
