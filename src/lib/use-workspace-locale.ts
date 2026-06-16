"use client";

import { useState } from "react";

import type { MarketingLocale } from "@/lib/marketing-locale";
import { parseWorkspaceLocale, readWorkspaceLocaleCookie } from "@/lib/workspace-locale";

export function useWorkspaceLocale(): MarketingLocale {
  return useState(() =>
    typeof document !== "undefined"
      ? parseWorkspaceLocale(readWorkspaceLocaleCookie())
      : "es",
  )[0];
}
