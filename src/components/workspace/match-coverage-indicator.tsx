"use client";

import { Zap } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
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

function CoverageRing({
  coverage,
  size = 28,
}: Readonly<{ coverage: number; size?: number }>) {
  const tone = matchCoverageRingTone(coverage);
  const pct = matchCoveragePercent(coverage) ?? 0;
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - coverage);

  return (
    <svg
      aria-hidden
      className={cn("shrink-0 -rotate-90", RING_COLORS[tone])}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <circle
        className="stroke-muted/40"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        strokeWidth={2.5}
      />
      <circle
        className={RING_STROKE[tone]}
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={2.5}
      />
      <title>{`${String(pct)}% coincidencia`}</title>
    </svg>
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
  const ringSize = size === "md" ? 32 : 28;
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
              "inline-flex cursor-help items-center gap-1.5 tabular-nums",
              size === "md" ? "text-sm" : "text-xs",
              className,
            )}
          >
            <CoverageRing coverage={matchCoverage} size={ringSize} />
            <span className="font-medium text-foreground">{lineCount}</span>
            <span className="text-muted-foreground">✓</span>
            <span className="font-medium">{pct}%</span>
            {showTouchlessBolt ? (
              <span className="inline-flex text-amber-500">
                <Zap aria-hidden className="size-3.5 fill-current" />
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
