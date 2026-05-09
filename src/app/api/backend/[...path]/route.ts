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
  const { idToken } = await getAuthSession();

  if (!idToken) {
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

  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };

  const init: RequestInit = { method: request.method, headers };

  if (request.method === "POST") {
    try {
      const body = await request.text();
      if (body) init.body = body;
    } catch {
      // no body
    }
  }

  let upstream_res: Response;
  try {
    upstream_res = await fetch(upstream, init);
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

  const text = await upstream_res.text();

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
