import { redirect } from "next/navigation";

import { WorkspaceBootstrapProvider } from "@/components/workspace/workspace-bootstrap-provider";
import { getAuthSession } from "@/lib/session";

import packageJson from "../../../../package.json";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { accessToken, idToken } = await getAuthSession();

  if (!idToken && !accessToken) {
    redirect("/login");
  }

  return (
    <WorkspaceBootstrapProvider appVersion={packageJson.version}>{children}</WorkspaceBootstrapProvider>
  );
}
