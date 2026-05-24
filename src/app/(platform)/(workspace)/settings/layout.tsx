import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { SettingsShell } from "@/components/workspace/settings-shell";
import { getAuthSession } from "@/lib/session";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { accessToken, idToken } = await getAuthSession();
  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return <SettingsShell>{children}</SettingsShell>;
}
