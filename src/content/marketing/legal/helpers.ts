import type { LegalBlock } from "@/content/marketing/types";

export const p = (text: string): LegalBlock => ({ kind: "p", text });
export const ul = (items: string[]): LegalBlock => ({ kind: "ul", items });
export const ol = (items: string[]): LegalBlock => ({ kind: "ol", items });
export const h3 = (text: string): LegalBlock => ({ kind: "h3", text });
export const callout = (
  text: string,
  options?: Readonly<{ title?: string; variant?: "info" | "warning" }>,
): LegalBlock => ({
  kind: "callout",
  variant: options?.variant ?? "info",
  title: options?.title,
  text,
});
export const table = (headers: string[], rows: string[][]): LegalBlock => ({
  kind: "table",
  headers,
  rows,
});
