/** Supplier-visible code or truncated internal id. */
export function formatOrderDisplayCode(
  orderId: string,
  displayCode?: string | null,
): string {
  const code = displayCode?.trim();
  if (code) return code;
  if (orderId.length <= 14) return orderId;
  return `${orderId.slice(0, 10)}…${orderId.slice(-4)}`;
}
