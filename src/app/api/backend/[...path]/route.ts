import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/session";

const API_URL = (process.env.API_URL ?? "").replace(/\/$/, "");

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

  const pathStr = segments.join("/");
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const upstream = `${API_URL}/${pathStr}${qs ? `?${qs}` : ""}`;

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

  const upstream_res = await fetch(upstream, init);
  const text = await upstream_res.text();

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  return NextResponse.json(body, { status: upstream_res.status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
