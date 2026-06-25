"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowRight, CheckCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarketingMessages } from "@/content/marketing/types";

type Mockup = MarketingMessages["mockup"];

const EASE = [0.22, 1, 0.36, 1] as const;

function useTypewriter(text: string, enabled: boolean, startDelayMs: number) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let startTs: number | null = null;
    const perChar = 26;

    const tick = (ts: number) => {
      if (cancelled) return;
      if (startTs === null) {
        startTs = ts + startDelayMs;
      }
      const elapsed = ts - startTs;
      if (elapsed < 0) {
        setCount(0);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const next = Math.min(text.length, Math.floor(elapsed / perChar));
      setCount(next);
      if (next < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, startDelayMs, text]);

  return enabled ? text.slice(0, count) : text;
}

export function HeroMockup({
  mockup,
}: Readonly<{
  mockup: Mockup;
}>) {
  const reduced = useReducedMotion();
  const animate = !reduced;
  const typed = useTypewriter(mockup.bubbleText, animate, 650);
  const typingDone = typed.length === mockup.bubbleText.length;
  const draftDelay = 0.15;
  const rowBase = 0.35;
  const rowStep = 0.12;
  const totalRows = mockup.rows.length + 1;
  const badgeDelay = rowBase + totalRows * rowStep + 0.1;

  return (
    <section aria-label={mockup.ariaPreview} className="mx-auto w-full max-w-5xl">
      <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-4">
        <motion.div
          animate={animate ? { opacity: 1, scale: 1, y: 0 } : undefined}
          className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/10"
          initial={animate ? { opacity: 0, scale: 0.98, y: 12 } : false}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="flex items-start gap-3 border-border/40 border-b pb-4">
            <div
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-semibold text-foreground text-sm"
            >
              LM
            </div>
            <div>
              <p className="font-semibold leading-tight">{mockup.chatName}</p>
              <p className="text-muted-foreground text-xs">{mockup.chatStatus}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-end gap-1">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2.5 text-primary-foreground shadow-sm">
              <p aria-label={mockup.bubbleText} className="text-sm leading-relaxed">
                <span aria-hidden>{typed}</span>
                {animate && !typingDone ? (
                  <span
                    aria-hidden
                    className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-primary-foreground/70 align-middle"
                  />
                ) : null}
              </p>
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-primary-foreground/75">
                <span>{mockup.timestamp}</span>
                <CheckCheck aria-hidden className="size-3.5" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </motion.div>

        <div aria-hidden className="hidden justify-center md:flex">
          <motion.div
            animate={
              animate
                ? { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.85] }
                : undefined
            }
            className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm"
            transition={
              animate
                ? { duration: 0.6, delay: 0.55, ease: EASE }
                : undefined
            }
          >
            <ArrowRight className="size-5 text-muted-foreground" strokeWidth={2} />
          </motion.div>
        </div>

        <motion.div
          animate={animate ? { opacity: 1, y: 0 } : undefined}
          className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/10"
          initial={animate ? { opacity: 0, y: 12 } : false}
          transition={{ duration: 0.5, delay: draftDelay, ease: EASE }}
        >
          <div className="flex flex-wrap items-center gap-2 border-border/40 border-b pb-4">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">
              {mockup.draftLabel}
            </span>
            <motion.span
              animate={animate ? { opacity: 1, scale: 1 } : undefined}
              initial={animate ? { opacity: 0, scale: 0.8 } : false}
              transition={{ duration: 0.35, delay: badgeDelay, ease: EASE }}
            >
              <Badge className="border-transparent bg-primary text-primary-foreground hover:bg-primary/90">
                {mockup.matchBadge}
              </Badge>
            </motion.span>
          </div>
          <ul className="divide-y divide-border/40">
            {mockup.rows.map(([label, qty], i) => (
              <motion.li
                animate={animate ? { opacity: 1, x: 0 } : undefined}
                className="flex items-center justify-between gap-4 py-3 text-sm"
                initial={animate ? { opacity: 0, x: 8 } : false}
                key={label}
                transition={{ duration: 0.3, delay: rowBase + i * rowStep, ease: EASE }}
              >
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground tabular-nums">{qty}</span>
              </motion.li>
            ))}
            <motion.li
              animate={animate ? { opacity: 1, x: 0 } : undefined}
              className="flex items-center justify-between gap-4 py-3 text-sm"
              initial={animate ? { opacity: 0, x: 8 } : false}
              transition={{
                duration: 0.3,
                delay: rowBase + mockup.rows.length * rowStep,
                ease: EASE,
              }}
            >
              <span className="font-medium">{mockup.deliveryLabel}</span>
              <span className="text-muted-foreground">{mockup.deliveryValue}</span>
            </motion.li>
          </ul>
          <motion.div
            animate={animate ? { opacity: 1, y: 0 } : undefined}
            initial={animate ? { opacity: 0, y: 6 } : false}
            transition={{ duration: 0.35, delay: badgeDelay + 0.1, ease: EASE }}
          >
            <Button className="mt-4 w-full" type="button">
              {mockup.confirm}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
