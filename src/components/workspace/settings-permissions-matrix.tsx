"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  normalizeRole,
  permissionLabel,
  roleLabel,
  type PermissionKey,
  type Role,
} from "@/lib/roles";
import {
  fetchTeamPermissionsViaProxy,
  putTeamRolePermissionsViaProxy,
  putTeamUserPermissionsViaProxy,
  type TeamPermissionsPayload,
} from "@/lib/team";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const EDITABLE_ROLES: Role[] = ["operator", "seller", "marketing"];

function roleHasPermission(
  role: Role,
  key: PermissionKey,
  payload: TeamPermissionsPayload | null,
): boolean {
  const overrides = payload?.roleOverrides?.[role];
  if (overrides && key in overrides) return overrides[key] === true;
  return DEFAULT_ROLE_PERMISSIONS[role].has(key);
}

function userHasPermission(
  sellerId: number,
  key: PermissionKey,
  role: string,
  payload: TeamPermissionsPayload | null,
): boolean {
  const userMap = payload?.userOverrides?.[String(sellerId)];
  if (userMap && key in userMap) return userMap[key]?.effective === true;
  const normalized = normalizeRole(role);
  if (!normalized || normalized === "owner") return true;
  return roleHasPermission(normalized, key, payload);
}

export function SettingsPermissionsMatrix({
  initialPayload,
}: Readonly<{
  initialPayload: TeamPermissionsPayload | null;
}>) {
  const { role: actorRole } = useWorkspacePermissions();
  const isOwner = normalizeRole(actorRole) === "owner";
  const canEditUsers = isOwner || normalizeRole(actorRole) === "operator";

  const [payload, setPayload] = useState(initialPayload);
  const [roleDraft, setRoleDraft] = useState<Record<PermissionKey, boolean>>(
    {} as Record<PermissionKey, boolean>,
  );
  const [selectedRole, setSelectedRole] = useState<Role>("operator");
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [userDraft, setUserDraft] = useState<Record<string, boolean>>({});
  const [savingRole, setSavingRole] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [loading, setLoading] = useState(false);

  const sellers = useMemo(() => payload?.sellers ?? [], [payload?.sellers]);

  const selectedSeller = useMemo(
    () => sellers.find((s) => s.sellerId === selectedSellerId) ?? null,
    [sellers, selectedSellerId],
  );

  const loadRoleDraft = useCallback(
    (role: Role) => {
      const draft = {} as Record<PermissionKey, boolean>;
      for (const key of PERMISSION_KEYS) {
        draft[key] = roleHasPermission(role, key, payload);
      }
      setRoleDraft(draft);
    },
    [payload],
  );

  const loadUserDraft = useCallback(
    (sellerId: number, role: string) => {
      const draft: Record<string, boolean> = {};
      for (const key of PERMISSION_KEYS) {
        draft[key] = userHasPermission(sellerId, key, role, payload);
      }
      setUserDraft(draft);
    },
    [payload],
  );

  useEffect(() => {
    setPayload(initialPayload);
  }, [initialPayload]);

  useEffect(() => {
    loadRoleDraft(selectedRole);
  }, [selectedRole, loadRoleDraft]);

  useEffect(() => {
    if (selectedSellerId == null) return;
    const seller = sellers.find((s) => s.sellerId === selectedSellerId);
    if (seller) loadUserDraft(seller.sellerId, seller.role);
  }, [selectedSellerId, sellers, loadUserDraft]);

  useEffect(() => {
    if (sellers.length > 0 && selectedSellerId == null) {
      const first = sellers.find((s) => normalizeRole(s.role) !== "owner");
      if (first) setSelectedSellerId(first.sellerId);
    }
  }, [sellers, selectedSellerId]);

  async function refreshPayload() {
    setLoading(true);
    try {
      const next = await fetchTeamPermissionsViaProxy();
      if (next) setPayload(next);
    } finally {
      setLoading(false);
    }
  }

  async function saveRolePermissions() {
    if (!isOwner) return;
    setSavingRole(true);
    try {
      const permissions: Record<string, boolean> = {};
      for (const key of PERMISSION_KEYS) {
        permissions[key] = roleDraft[key] === true;
      }
      await putTeamRolePermissionsViaProxy(selectedRole, permissions);
      toast.success(`Permisos de ${roleLabel(selectedRole)} guardados.`);
      await refreshPayload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar los permisos.");
    } finally {
      setSavingRole(false);
    }
  }

  async function saveUserPermissions() {
    if (!canEditUsers || selectedSellerId == null) return;
    setSavingUser(true);
    try {
      await putTeamUserPermissionsViaProxy(selectedSellerId, userDraft);
      toast.success("Permisos del usuario guardados.");
      await refreshPayload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar los permisos.");
    } finally {
      setSavingUser(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <p className="text-muted-foreground">
          Los permisos efectivos siguen este orden:{" "}
          <span className="font-medium text-foreground">override por usuario</span> →{" "}
          <span className="font-medium text-foreground">configuración por rol</span> →{" "}
          <span className="font-medium text-foreground">valores predeterminados</span>. El
          propietario siempre tiene acceso total.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">Permisos por rol</h2>
            <p className="text-muted-foreground text-sm">
              {isOwner
                ? "Editá los permisos predeterminados de cada rol."
                : "Vista de solo lectura de los permisos por rol."}
            </p>
          </div>
          {loading ? <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="perm-role">Rol</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <SelectTrigger className="w-[200px]" id="perm-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isOwner ? (
            <Button disabled={savingRole} type="button" onClick={() => void saveRolePermissions()}>
              {savingRole ? (
                <>
                  <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar rol"
              )}
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[240px]">Permiso</TableHead>
                {EDITABLE_ROLES.map((r) => (
                  <TableHead key={r} className="text-center">
                    {roleLabel(r)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_GROUPS.map((group) => (
                <Fragment key={group.label}>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell className="font-medium" colSpan={1 + EDITABLE_ROLES.length}>
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.keys.map((key) => (
                    <TableRow key={key}>
                      <TableCell className="text-sm">{permissionLabel(key)}</TableCell>
                      {EDITABLE_ROLES.map((r) => {
                        const checked =
                          r === selectedRole
                            ? roleDraft[key] === true
                            : roleHasPermission(r, key, payload);
                        const editable = isOwner && r === selectedRole;
                        return (
                          <TableCell key={`${key}-${r}`} className="text-center">
                            <Switch
                              checked={checked}
                              disabled={!editable}
                              onCheckedChange={(next) => {
                                if (!editable) return;
                                setRoleDraft((prev) => ({ ...prev, [key]: next }));
                              }}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Permisos por usuario</h2>
          <p className="text-muted-foreground text-sm">
            {canEditUsers
              ? "Otorgá o revocá permisos específicos para un miembro del equipo."
              : "Vista de solo lectura de permisos por usuario."}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="perm-user">Usuario</Label>
            <Select
              value={selectedSellerId != null ? String(selectedSellerId) : undefined}
              onValueChange={(v) => setSelectedSellerId(Number(v))}
            >
              <SelectTrigger className="w-[280px]" id="perm-user">
                <SelectValue placeholder="Seleccioná un usuario" />
              </SelectTrigger>
              <SelectContent>
                {sellers
                  .filter((s) => normalizeRole(s.role) !== "owner")
                  .map((s) => (
                    <SelectItem key={s.sellerId} value={String(s.sellerId)}>
                      {s.name} — {roleLabel(s.role)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {canEditUsers ? (
            <Button
              disabled={savingUser || selectedSellerId == null}
              type="button"
              onClick={() => void saveUserPermissions()}
            >
              {savingUser ? (
                <>
                  <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar usuario"
              )}
            </Button>
          ) : null}
        </div>

        {selectedSeller ? (
          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permiso</TableHead>
                  <TableHead className="w-[120px] text-center">Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSION_GROUPS.map((group) => (
                  <Fragment key={`user-${group.label}`}>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell className="font-medium" colSpan={2}>
                        {group.label}
                      </TableCell>
                    </TableRow>
                    {group.keys.map((key) => (
                      <TableRow key={`user-${key}`}>
                        <TableCell className="text-sm">{permissionLabel(key)}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={userDraft[key] === true}
                            disabled={!canEditUsers}
                            onCheckedChange={(next) => {
                              if (!canEditUsers) return;
                              setUserDraft((prev) => ({ ...prev, [key]: next }));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Seleccioná un usuario para ver sus permisos.</p>
        )}
      </section>
    </div>
  );
}
