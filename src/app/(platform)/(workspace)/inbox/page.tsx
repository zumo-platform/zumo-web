import { redirect } from "next/navigation";

import { InboxClient } from "@/components/inbox/inbox-client";
import { getAuthSession } from "@/lib/session";

export default async function InboxPage() {
  const { idToken } = await getAuthSession();

  if (!idToken) {
    redirect("/login");
  }

  const apiUrl = (process.env.API_URL ?? "").replace(/\/$/, "");

  let seller: { sellerId: number; email: string; name: string; role: string; active: boolean } | null = null;

  try {
    const res = await fetch(`${apiUrl}/sellers/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      seller = data.seller ?? null;
    }
  } catch {
    // non-fatal — client will handle missing seller context
  }

  return (
    <InboxClient
      seller={seller ?? { sellerId: 0, email: "", name: "Seller", role: "owner", active: true }}
    />
  );
}
