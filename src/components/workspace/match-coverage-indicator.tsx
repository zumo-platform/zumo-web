"use client";

import { Check, Zap } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  isFullMatchCoverage,
  matchCoveragePercent,
  matchCoverageRingTone,
  matchCoverageTooltip,
  type MatchCoverageRingTone,
} from "@/lib/match-coverage";
import { cn } from "@/lib/utils";

const RING_COLORS: Record<MatchCoverageRingTone, string> = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-red-600",
};

const RING_STROKE: Record<MatchCoverageRingTone, string> = {
  high: "stroke-emerald-500",
  medium: "stroke-amber-500",
  low: "stroke-red-500",
};

const FILLED_ICON_PX = { sm: 22, md: 26 } as const;
const RING_ICON_PX = { sm: 30, md: 36 } as const;

function CoverageIcon({
  coverage,
  size = "sm",
}: Readonly<{ coverage: number; size?: "sm" | "md" }>) {
  const tone = matchCoverageRingTone(coverage);
  const pct = matchCoveragePercent(coverage) ?? 0;
  const filledPx = FILLED_ICON_PX[size];
  const ringPx = RING_ICON_PX[size];

  if (isFullMatchCoverage(coverage)) {
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600/20"
        style={{ width: filledPx, height: filledPx }}
        title={`${String(pct)}% coincidencia`}
      >
        <Check className={size === "md" ? "size-3.5" : "size-3"} strokeWidth={3} />
      </span>
    );
  }

  const r = (ringPx - 5) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - coverage);

  return (
    <svg
      aria-hidden
      className={cn("shrink-0 -rotate-90", RING_COLORS[tone])}
      height={ringPx}
      viewBox={`0 0 ${ringPx} ${ringPx}`}
      width={ringPx}
    >
      <circle
        className="stroke-muted/50"
        cx={ringPx / 2}
        cy={ringPx / 2}
        fill="none"
        r={r}
        strokeWidth={4}
      />
      <circle
        className={RING_STROKE[tone]}
        cx={ringPx / 2}
        cy={ringPx / 2}
        fill="none"
        r={r}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={4}
      />
      <title>{`${String(pct)}% coincidencia`}</title>
    </svg>
  );
}

/** Blue ⚡ shown on touchless auto-confirmed orders (Rekki-style integration signal). */
export function TouchlessBolt({
  className,
  size = "sm",
}: Readonly<{ className?: string; size?: "sm" | "md" }>) {
  return (
    <Zap
      aria-hidden
      className={cn(
        "shrink-0 fill-blue-500 text-blue-500",
        size === "md" ? "size-4" : "size-3.5",
        className,
      )}
    />
  );
}

export function MatchCoverageIndicator({
  lineCount,
  matchCoverage,
  isTouchless = false,
  autoCommitEnabled = false,
  className,
  size = "sm",
}: Readonly<{
  lineCount: number;
  matchCoverage: number | null;
  isTouchless?: boolean;
  autoCommitEnabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}>) {
  const pct = matchCoveragePercent(matchCoverage);
  const tooltip = matchCoverageTooltip(matchCoverage, isTouchless);
  const showTouchlessBolt = autoCommitEnabled && isTouchless;

  if (matchCoverage === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-muted-foreground tabular-nums",
          size === "md" ? "text-sm" : "text-xs",
          className,
        )}
      >
        <span className="font-medium text-foreground">{lineCount}</span>
        <span>—</span>
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex cursor-help items-center gap-2 tabular-nums",
              size === "md" ? "text-sm" : "text-xs",
              className,
            )}
          >
            <CoverageIcon coverage={matchCoverage} size={size} />
            <span className="font-semibold text-foreground">{lineCount}</span>
            <span className="font-semibold text-foreground">{pct}%</span>
            {showTouchlessBolt ? (
              <span className="inline-flex items-center">
                <TouchlessBolt size={size} />
                <span className="sr-only">Touchless</span>
              </span>
            ) : null}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-left" side="top">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
