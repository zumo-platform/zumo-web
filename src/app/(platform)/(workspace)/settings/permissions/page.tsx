import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsPermissionsMatrix } from "@/components/workspace/settings-permissions-matrix";
import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import { getAuthSession } from "@/lib/session";
import { parsePermissionsPayload } from "@/lib/team";

export const metadata: Metadata = {
  title: "Opciones — Permisos del equipo",
};

export const dynamic = "force-dynamic";

async function fetchPermissionsServer(
  apiUrl: string,
  idToken?: string | null,
  accessToken?: string | null,
) {
  const base = apiUrl.replace(/\/+$/, "");
  if (!base) return null;
  const bearerCandidates = [
    ...new Set(
      [idToken, accessToken].filter((t): t is string => typeof t === "string" && t.length > 0),
    ),
  ];
  if (bearerCandidates.length === 0) return null;

  const url = joinApiGatewayPath(base, "dashboard/team/permissions");
  for (const bearer of bearerCandidates) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (!res.ok) continue;
      return (await res.json()) as unknown;
    } catch {
      /* try next bearer */
    }
  }
  return null;
}

export default async function SettingsPermissionsPage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const raw = await fetchPermissionsServer(apiUrl, idToken, accessToken);

  if (raw === null) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        No pudimos cargar los permisos del equipo. Revisá tu sesión e intentá de nuevo.
      </div>
    );
  }

  return <SettingsPermissionsMatrix initialPayload={parsePermissionsPayload(raw)} />;
}
