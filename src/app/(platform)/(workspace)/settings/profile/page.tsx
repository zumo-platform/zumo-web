import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SettingsProfileView } from "@/components/workspace/settings-profile-view";
import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import type { SellerMe } from "@/lib/dashboard-types";
import { getAuthSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opciones — Perfil",
};

export const dynamic = "force-dynamic";

async function fetchSellerMe(
  apiUrl: string | null,
  idToken: string | null,
  accessToken: string | null,
): Promise<SellerMe | null> {
  if (!apiUrl) return null;
  const bearer = idToken ?? accessToken;
  if (!bearer) return null;
  try {
    const res = await fetch(joinApiGatewayPath(apiUrl, "sellers/me"), {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SellerMe;
  } catch {
    return null;
  }
}

export default async function SettingsProfilePage() {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();
  const me = await fetchSellerMe(apiUrl, idToken, accessToken);

  if (!me?.seller) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
        No pudimos cargar tu perfil. Revisá tu sesión e intentá de nuevo.
      </div>
    );
  }

  return <SettingsProfileView seller={me.seller} />;
}
