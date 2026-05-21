import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerApiBaseUrl, joinApiGatewayPath } from "@/lib/api";
import { fetchWhatsappStatus } from "@/lib/dashboard-api";
import type { SellerMe, WhatsappStatusResult } from "@/lib/dashboard-types";
import { getAuthSession } from "@/lib/session";

import packageJson from "../../../../package.json";

const fallbackSeller: SellerMe["seller"] = {
  sellerId: 0,
  email: "",
  name: "Usuario",
  phone: null,
  role: "owner",
  active: true,
};

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  const apiUrl = getServerApiBaseUrl();

  let seller = fallbackSeller;
  let supplier: SellerMe["supplier"] | null = null;
  let whatsappStatus: WhatsappStatusResult | null = null;

  const bearerCandidates = [...new Set([idToken, accessToken].filter((t): t is string => Boolean(t)))];

  if (apiUrl) {
    try {
      const url = joinApiGatewayPath(apiUrl, "sellers/me");

      let data: SellerMe | null = null;
      for (const bearer of bearerCandidates) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${bearer}` },
          cache: "no-store",
        });
        if (!res.ok) continue;
        data = (await res.json()) as SellerMe;
        break;
      }

      if (data?.seller) seller = data.seller;
      supplier = data?.supplier ?? null;
    } catch {
      // fallback seller keeps shell usable
    }
  }

  for (const bearer of bearerCandidates) {
    whatsappStatus = await fetchWhatsappStatus(bearer);
    if (whatsappStatus) break;
  }

  return (
    <WorkspaceShell
      appVersion={packageJson.version}
      seller={seller}
      supplier={supplier}
      whatsappStatus={whatsappStatus}
    >
      {children}
    </WorkspaceShell>
  );
}
