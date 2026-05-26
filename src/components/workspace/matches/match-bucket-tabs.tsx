"use client";

import type { MatchBucket } from "@/lib/dashboard-matches";
import { cn } from "@/lib/utils";

const BUCKET_META: ReadonlyArray<{
  id: MatchBucket;
  label: string;
  dotClass: string;
}> = [
  { id: "needs_review", label: "Necesitan revisión", dotClass: "bg-red-500" },
  { id: "with_multipliers", label: "Con multiplicadores", dotClass: "bg-blue-500" },
  { id: "correct", label: "Correctos", dotClass: "bg-green-500" },
];

export function MatchBucketTabs({
  activeBucket,
  counts,
  recentlyEdited,
  onBucketChange,
  onRecentlyEditedChange,
}: Readonly<{
  activeBucket: MatchBucket;
  counts: Record<MatchBucket, number>;
  recentlyEdited: boolean;
  onBucketChange: (bucket: MatchBucket) => void;
  onRecentlyEditedChange: (value: boolean) => void;
}>) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {BUCKET_META.map((bucket) => {
          const active = activeBucket === bucket.id;
          return (
            <button
              key={bucket.id}
              type="button"
              onClick={() => onBucketChange(bucket.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <span className={cn("size-2 rounded-full", bucket.dotClass)} />
              <span>{bucket.label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                {counts[bucket.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          checked={recentlyEdited}
          className="size-4 rounded border-border"
          type="checkbox"
          onChange={(e) => onRecentlyEditedChange(e.target.checked)}
        />
        Solo recientemente editados
      </label>
    </div>
  );
}
