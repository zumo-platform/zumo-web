"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

import { fetchUnreadWhatsappCount } from "@/lib/whatsapp-unread";
import { cn } from "@/lib/utils";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const POLL_MS = 5_000;

function formatUnreadCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function useWhatsappUnreadCount(): number {
  const pathname = usePathname();
  const { can } = useWorkspacePermissions();
  const canViewAll = can("conversations.view_all");
  const [count, setCount] = useState(0);
  const canViewAllRef = useRef(canViewAll);
  canViewAllRef.current = canViewAll;

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function refresh() {
      try {
        const next = await fetchUnreadWhatsappCount(canViewAllRef.current);
        if (!cancelled) setCount(next);
      } catch {
        // Keep the last known count on transient failures.
      }
    }

    function scheduleNext() {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (document.hidden) {
          scheduleNext();
          return;
        }
        await refresh();
        if (!cancelled) scheduleNext();
      }, POLL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void refresh().finally(scheduleNext);
      }
    }

    void refresh().finally(scheduleNext);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [canViewAll]);

  useEffect(() => {
    if (pathname.startsWith("/whatsapp")) {
      void fetchUnreadWhatsappCount(canViewAll).then(setCount).catch(() => undefined);
    }
  }, [pathname, canViewAll]);

  return count;
}

export function WhatsappUnreadBadge({
  count,
  className,
}: Readonly<{ count: number; className?: string }>) {
  return (
    <AnimatePresence initial={false}>
      {count > 0 ? (
        <motion.span
          animate={{ scale: 1, opacity: 1 }}
          aria-label={`${count} conversaciones sin leer`}
          className={cn(
            "pointer-events-none absolute top-[-3px] left-[7px] z-10 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[9px] font-semibold leading-none text-white shadow-sm",
            className,
          )}
          exit={{ scale: 0.4, opacity: 0 }}
          initial={{ scale: 0, opacity: 0 }}
          key="whatsapp-unread-badge"
          transition={{
            type: "spring",
            stiffness: 520,
            damping: 18,
            mass: 0.55,
          }}
        >
          <motion.span
            animate={{ scale: 1 }}
            className="tabular-nums"
            initial={{ scale: 0.6 }}
            key={count}
            transition={{ type: "spring", stiffness: 700, damping: 22 }}
          >
            {formatUnreadCount(count)}
          </motion.span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
