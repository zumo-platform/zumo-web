import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import type { SellerMe } from "@/lib/dashboard-types";
import { getAuthSession } from "@/lib/session";

import packageJson from "../../../../package.json";

const fallbackSeller: SellerMe["seller"] = {
  sellerId: 0,
  email: "",
  name: "Usuario",
  role: "owner",
  active: true,
};

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { idToken } = await getAuthSession();

  if (!idToken) {
    redirect("/login");
  }

  const apiUrl = (process.env.API_URL ?? "").replace(/\/$/, "");

  let seller = fallbackSeller;
  let supplier: SellerMe["supplier"] | null = null;

  try {
    const res = await fetch(`${apiUrl}/sellers/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as SellerMe;
      if (data.seller) seller = data.seller;
      supplier = data.supplier ?? null;
    }
  } catch {
    // fallback seller keeps shell usable
  }

  return (
    <WorkspaceShell
      appVersion={packageJson.version}
      seller={seller}
      supplier={supplier}
    >
      {children}
    </WorkspaceShell>
  );
}
