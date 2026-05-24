/** Parse API `matchCoverage` (0–1) from number or numeric string. */
export function parseMatchCoverage(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

export function matchCoveragePercent(coverage: number | null): number | null {
  if (coverage === null) return null;
  return Math.round(coverage * 100);
}

export type MatchCoverageRingTone = "high" | "medium" | "low";

export function isFullMatchCoverage(coverage: number | null): boolean {
  return coverage !== null && coverage >= 0.999;
}

export function matchCoverageTooltip(
  coverage: number | null,
  isTouchless: boolean,
): string {
  const pct = matchCoveragePercent(coverage);
  if (isTouchless) {
    return "Confirmado automáticamente por IA sin intervención del vendedor (touchless ⚡).";
  }
  if (isFullMatchCoverage(coverage)) {
    return "Coincidencia perfecta en la primera extracción. Con confirmación automática activada, los pedidos nuevos elegibles pasan directo a confirmado con ⚡. Los borradores ya creados no se confirman solos — enviá un pedido nuevo por WhatsApp para probar.";
  }
  if (pct !== null) {
    return `${String(pct)}% de las líneas coincidieron con el inventario en la primera extracción.`;
  }
  return "Sin datos de coincidencia del AI.";
}

export function matchCoverageRingTone(coverage: number | null): MatchCoverageRingTone {
  if (coverage === null) return "low";
  const pct = coverage * 100;
  if (pct >= 90) return "high";
  if (pct >= 50) return "medium";
  return "low";
}
