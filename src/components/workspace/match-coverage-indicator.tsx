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
  matchCoverageMissingLabel,
  matchCoveragePercent,
  matchCoverageTooltip,
} from "@/lib/match-coverage";
import { cn } from "@/lib/utils";

const RING_TRACK = "stroke-muted-foreground/35";
const RING_PROGRESS = "stroke-emerald-600";

const FILLED_ICON_PX = { sm: 22, md: 26 } as const;
const RING_ICON_PX = { sm: 30, md: 36 } as const;

function CoverageIcon({
  coverage,
  size = "sm",
}: Readonly<{ coverage: number; size?: "sm" | "md" }>) {
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
      className="shrink-0 -rotate-90 text-emerald-600"
      height={ringPx}
      viewBox={`0 0 ${ringPx} ${ringPx}`}
      width={ringPx}
    >
      <circle
        className={RING_TRACK}
        cx={ringPx / 2}
        cy={ringPx / 2}
        fill="none"
        r={r}
        strokeWidth={4}
      />
      <circle
        className={RING_PROGRESS}
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

/** Blue ⚡ — 100% AI catalog match (coincidencia perfecta). */
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

function MatchCoverageDisplay({
  units,
  matchCoverage,
  size = "sm",
  className,
  tooltip,
}: Readonly<{
  units: number;
  matchCoverage: number;
  size?: "sm" | "md";
  className?: string;
  tooltip?: string;
}>) {
  const pct = matchCoveragePercent(matchCoverage);
  const full = isFullMatchCoverage(matchCoverage);

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 tabular-nums",
        size === "md" ? "text-sm" : "text-xs",
        tooltip ? "cursor-help" : undefined,
        className,
      )}
    >
      <span className="font-semibold text-foreground">{units}</span>
      <CoverageIcon coverage={matchCoverage} size={size} />
      <span
        className={cn(
          "font-semibold",
          full ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {pct}%
      </span>
      {full ? (
        <span className="inline-flex items-center" title="100% coincidencia AI">
          <TouchlessBolt size={size} />
          <span className="sr-only">100% coincidencia AI</span>
        </span>
      ) : null}
    </span>
  );

  if (!tooltip) return content;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-left" side="top">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Per order line: quantity + match ring/check + % (+ ⚡ when matched). */
export function LineMatchIndicator({
  quantity,
  matched,
  size = "sm",
  className,
}: Readonly<{
  quantity: number;
  matched: boolean;
  size?: "sm" | "md";
  className?: string;
}>) {
  const coverage = matched ? 1 : 0;
  const tooltip = matched
    ? "Línea coincidente con el catálogo (100%)."
    : "Línea sin coincidencia con el catálogo.";

  return (
    <MatchCoverageDisplay
      className={className}
      matchCoverage={coverage}
      size={size}
      tooltip={tooltip}
      units={quantity}
    />
  );
}

export function MatchCoverageIndicator({
  lineCount,
  matchCoverage,
  isTouchless = false,
  autoCommitEnabled: _autoCommitEnabled = false,
  className,
  size = "sm",
}: Readonly<{
  lineCount: number;
  matchCoverage: number | null;
  isTouchless?: boolean;
  /** @deprecated Bolt now marks 100% AI match, not touchless setting alone. */
  autoCommitEnabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}>) {
  const tooltip = matchCoverageTooltip(matchCoverage, isTouchless);

  if (matchCoverage === null) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex cursor-help items-center text-muted-foreground",
                size === "md" ? "text-sm" : "text-xs",
                className,
              )}
            >
              {matchCoverageMissingLabel(lineCount)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-left" side="top">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <MatchCoverageDisplay
      className={className}
      matchCoverage={matchCoverage}
      size={size}
      tooltip={tooltip}
      units={lineCount}
    />
  );
}
