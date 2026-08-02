"use client";

import { useEffect, useRef } from "react";

import { showNotificationAlert } from "@/components/workspace/notification-alert";
import { fetchNotificationPrefs } from "@/lib/notifications/preferences";
import { type NotificationItemDTO } from "@/lib/notifications/types";

const POLL_MS = 15_000;
const PREFS_REFRESH_MS = 60_000;

type FeedResponse = {
  items: NotificationItemDTO[];
  serverTime: string;
};

export function NotificationProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const sinceRef = useRef<string>(new Date().toISOString());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const enabledRef = useRef<boolean>(true);
  const lastPrefsCheckRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function refreshEnabled(force = false) {
      const now = Date.now();
      if (!force && now - lastPrefsCheckRef.current < PREFS_REFRESH_MS) return;
      lastPrefsCheckRef.current = now;
      try {
        const prefs = await fetchNotificationPrefs();
        enabledRef.current = prefs.notifyEnabled;
      } catch {
        // Keep prior value on failure.
      }
    }

    async function poll() {
      try {
        await refreshEnabled();
        if (!enabledRef.current) return;

        const url = `/api/backend/dashboard/notifications?since=${encodeURIComponent(sinceRef.current)}`;
        const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as FeedResponse;
          const fresh = data.items.filter((i) => !seenIdsRef.current.has(i.id));
          for (const item of [...fresh].reverse()) {
            seenIdsRef.current.add(item.id);
            showNotificationAlert(item);
          }
          const newest = data.items[0]?.createdAt;
          sinceRef.current = newest ?? data.serverTime ?? sinceRef.current;
          if (seenIdsRef.current.size > 500) {
            seenIdsRef.current = new Set(Array.from(seenIdsRef.current).slice(-250));
          }
        }
      } catch {
        // Network blip — next tick retries.
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, POLL_MS);
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void refreshEnabled(true).then(poll);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    void refreshEnabled(true).then(poll);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <>{children}</>;
}
