"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import {
  canWithRole,
  normalizeRole,
  permissionsFromRole,
  type PermissionKey,
} from "@/lib/roles";
import {
  calendarDateInTimezone,
  DEFAULT_SUPPLIER_TIMEZONE,
  formatInstantCreatedAtInTimezone,
  formatInstantDateInTimezone,
  formatInstantDateTimeInTimezone,
  formatInstantTimeInTimezone,
  formatStoredDateOnly,
} from "@/lib/supplier-timezone";

export type WorkspacePreferences = Readonly<{
  timeZone: string;
  autoCommitEnabled: boolean;
  role: string;
  sellerId: number;
  permissions: readonly string[];
}>;

const defaultPermissionsContext: WorkspacePreferences = {
  timeZone: DEFAULT_SUPPLIER_TIMEZONE,
  autoCommitEnabled: false,
  role: "owner",
  sellerId: 0,
  permissions: [...permissionsFromRole("owner")],
};

const WorkspacePreferencesContext = createContext<WorkspacePreferences>(defaultPermissionsContext);

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

export function useWorkspacePermissions() {
  const { role, sellerId, permissions } = useWorkspacePreferences();
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = useCallback(
    (key: PermissionKey) => canWithRole(role, permissionSet, key),
    [role, permissionSet],
  );
  return {
    role,
    sellerId,
    permissions: permissionSet,
    can,
    isOwner: normalizeRole(role) === "owner",
  };
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
      formatInstantCreatedAt: (iso: string | null | undefined) =>
        formatInstantCreatedAtInTimezone(iso, timeZone),
      formatStoredDateOnly: (raw: string | null | undefined) => formatStoredDateOnly(raw),
      calendarToday: () => calendarDateInTimezone(timeZone),
    }),
    [timeZone],
  );
}
