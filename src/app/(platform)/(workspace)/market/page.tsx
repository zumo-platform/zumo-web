"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

const MarketMapExperience = dynamic(
  () =>
    import("@/components/workspace/market-map-experience").then(
      (m) => m.MarketMapExperience,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-none" />,
  },
);

export default function MarketPage() {
  return (
    <div className="flex h-[calc(100vh-var(--workspace-header,3.5rem))] min-h-0 flex-col">
      <MarketMapExperience />
    </div>
  );
}
