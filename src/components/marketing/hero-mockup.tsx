import { ArrowRight, CheckCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarketingMessages } from "@/content/marketing/types";

export function HeroMockup({
  mockup,
}: Readonly<{
  mockup: MarketingMessages["mockup"];
}>) {
  return (
    <section aria-label={mockup.ariaPreview} className="mx-auto w-full max-w-5xl">
      <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/10">
          <div className="flex items-start gap-3 border-border/40 border-b pb-4">
            <div
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-semibold text-sm text-white"
            >
              LM
            </div>
            <div>
              <p className="font-semibold leading-tight">{mockup.chatName}</p>
              <p className="text-emerald-500 text-xs">{mockup.chatStatus}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-end gap-1">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600/90 px-3 py-2.5 text-white shadow-sm">
              <p className="text-sm leading-relaxed">{mockup.bubbleText}</p>
              <div className="mt-1 flex items-center justify-end gap-1 text-emerald-100/90 text-[10px]">
                <span>{mockup.timestamp}</span>
                <CheckCheck aria-hidden className="size-3.5" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden className="hidden justify-center md:flex">
          <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm">
            <ArrowRight className="size-5 text-muted-foreground" strokeWidth={2} />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-center gap-2 border-border/40 border-b pb-4">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">
              {mockup.draftLabel}
            </span>
            <Badge className="border-transparent bg-emerald-600/90 text-white hover:bg-emerald-600">
              {mockup.matchBadge}
            </Badge>
          </div>
          <ul className="divide-y divide-border/40">
            {mockup.rows.map(([label, qty]) => (
              <li className="flex items-center justify-between gap-4 py-3 text-sm" key={label}>
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground tabular-nums">{qty}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 py-3 text-sm">
              <span className="font-medium">{mockup.deliveryLabel}</span>
              <span className="text-muted-foreground">{mockup.deliveryValue}</span>
            </li>
          </ul>
          <Button className="mt-4 w-full" type="button">
            {mockup.confirm}
          </Button>
        </div>
      </div>
    </section>
  );
}
