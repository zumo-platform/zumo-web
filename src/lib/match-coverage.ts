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

export function matchCoverageRingTone(coverage: number | null): MatchCoverageRingTone {
  if (coverage === null) return "low";
  const pct = coverage * 100;
  if (pct >= 90) return "high";
  if (pct >= 50) return "medium";
  return "low";
}
