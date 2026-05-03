import type { Metadata } from "next";
import Link from "next/link";

import { AuthForms, type AuthTabValue } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Access your Zumo distributor workspace.",
};

type LoginPageProps = Readonly<{
  searchParams: Promise<{ tab?: string }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { tab } = await searchParams;
  const defaultTab: AuthTabValue = tab === "signup" ? "signup" : "signin";

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <Link className="font-semibold text-lg tracking-tight" href="/en">
            Zumo
          </Link>
          <p className="text-muted-foreground text-sm">
            Sign in or create an account for the distributor workspace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground text-xs">
            <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/en">
              Marketing (English)
            </Link>
            <span aria-hidden className="text-border">
              ·
            </span>
            <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/es">
              Marketing (Español)
            </Link>
          </div>
        </div>

        <AuthForms defaultTab={defaultTab} key={defaultTab} />
      </div>
    </main>
  );
}
