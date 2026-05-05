import { redirect } from "next/navigation";

type LoginRedirectProps = Readonly<{
  searchParams: Promise<{ tab?: string }>;
}>;

/** Bare `/login` defaults to Spanish-first auth (`/es/login`). */
export default async function LegacyLoginRedirect({ searchParams }: LoginRedirectProps) {
  const { tab } = await searchParams;
  const suffix = tab === "signup" ? "?tab=signup" : "";
  redirect(`/es/login${suffix}`);
}
