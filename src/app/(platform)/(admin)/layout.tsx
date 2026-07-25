import type { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchServerPermissions, hasMarketAdmin } from "@/lib/server-permissions";
import { getAuthSession } from "@/lib/session";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  // Hard server-side gate: staff-only tooling, never merely hidden in the nav.
  const resolved = await fetchServerPermissions();
  if (!hasMarketAdmin(resolved)) {
    redirect("/");
  }

  return (
    <div className="bg-muted/20 min-h-screen">
      <header className="bg-background border-b">
        <div className="flex h-14 items-center gap-3 px-4">
          <span className="bg-foreground text-background rounded px-2 py-0.5 text-xs font-semibold">
            ADMIN
          </span>
          <span className="font-semibold">Zumo Market — Data Ops</span>
          <Link
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-auto rounded text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            href="/inbox"
          >
            Volver al panel
          </Link>
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
