"use client";

import { createContext, useContext, useMemo } from "react";

import {
  calendarDateInTimezone,
  DEFAULT_SUPPLIER_TIMEZONE,
  formatInstantDateInTimezone,
  formatInstantDateTimeInTimezone,
  formatInstantTimeInTimezone,
  formatStoredDateOnly,
} from "@/lib/supplier-timezone";

export type WorkspacePreferences = Readonly<{
  timeZone: string;
  autoCommitEnabled: boolean;
}>;

const WorkspacePreferencesContext = createContext<WorkspacePreferences>({
  timeZone: DEFAULT_SUPPLIER_TIMEZONE,
  autoCommitEnabled: false,
});

export function WorkspacePreferencesProvider({
  value,
  children,
}: Readonly<{
  value: WorkspacePreferences;
  children: React.ReactNode;
}>) {
  return (
    <WorkspacePreferencesContext.Provider value={value}>
      {children}
    </WorkspacePreferencesContext.Provider>
  );
}

export function useWorkspacePreferences(): WorkspacePreferences {
  return useContext(WorkspacePreferencesContext);
}

export function useSupplierTimeFormatters() {
  const { timeZone } = useWorkspacePreferences();
  return useMemo(
    () => ({
      timeZone,
      formatInstantDate: (iso: string | null | undefined) =>
        formatInstantDateInTimezone(iso, timeZone),
      formatInstantTime: (iso: string | null | undefined) =>
        formatInstantTimeInTimezone(iso, timeZone),
      formatInstantDateTime: (iso: string | null | undefined) =>
        formatInstantDateTimeInTimezone(iso, timeZone),
      formatStoredDateOnly: (raw: string | null | undefined) => formatStoredDateOnly(raw),
      calendarToday: () => calendarDateInTimezone(timeZone),
    }),
    [timeZone],
  );
}
