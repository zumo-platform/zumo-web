"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2, Mail, Trash2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TeamInviteSheet } from "@/components/workspace/team-invite-sheet";
import {
  ASSIGNABLE_ROLES,
  canEditTargetRole,
  normalizeRole,
  roleLabel,
  teamStateLabel,
  type AssignableRole,
} from "@/lib/roles";
import {
  createTeamInvitationViaProxy,
  fetchTeamViaProxy,
  patchTeamSellerRoleViaProxy,
  removeTeamSellerViaProxy,
  revokeTeamInvitationViaProxy,
  type TeamMemberRow,
} from "@/lib/team";
import { cn } from "@/lib/utils";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

function stateBadgeClass(state: TeamMemberRow["state"]): string {
  return state === "pending"
    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
}

export function SettingsSellersTable({
  initialTeam,
  onTeamChange,
}: Readonly<{
  initialTeam: TeamMemberRow[];
  onTeamChange?: (team: TeamMemberRow[]) => void;
}>) {
  const { role: actorRole, sellerId: actorSellerId, can: canPerm } = useWorkspacePermissions();
  const [team, setTeam] = useState(initialTeam);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TeamMemberRow | null>(null);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [removeSavingId, setRemoveSavingId] = useState<string | null>(null);
  const [resendSavingId, setResendSavingId] = useState<string | null>(null);

  const canInvite = canPerm("users.invite");
  const canRemove = canPerm("users.remove");
  const canEditRole = canPerm("users.edit_role");

  useEffect(() => {
    setTeam(initialTeam);
  }, [initialTeam]);

  const skipParentSync = useRef(true);
  useEffect(() => {
    if (skipParentSync.current) {
      skipParentSync.current = false;
      return;
    }
    onTeamChange?.(team);
  }, [team, onTeamChange]);

  function updateTeam(next: TeamMemberRow[] | ((prev: TeamMemberRow[]) => TeamMemberRow[])) {
    setTeam((prev) => (typeof next === "function" ? next(prev) : next));
  }

  async function refreshTeam() {
    setLoading(true);
    try {
      const rows = await fetchTeamViaProxy();
      if (rows) updateTeam(rows);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendInvitation(row: TeamMemberRow) {
    setResendSavingId(row.id);
    try {
      const role = normalizeRole(row.role);
      if (!role || role === "owner") {
        toast.error("No se pudo reenviar la invitación.");
        return;
      }
      const { emailSent, acceptUrl, emailMessage } = await createTeamInvitationViaProxy({
        name: row.name,
        email: row.email,
        role,
      });
      if (emailSent) {
        toast.success(`Invitación reenviada a ${row.email}.`);
        return;
      }
      if (acceptUrl) {
        toast.message(
          emailMessage ??
            "No pudimos enviar el correo automáticamente. Compartí este enlace con la persona para que se registre:",
          {
            action: {
              label: "Copiar enlace",
              onClick: () => {
                void navigator.clipboard.writeText(acceptUrl);
                toast.message("Enlace copiado.");
              },
            },
          },
        );
        return;
      }
      toast.success("Invitación actualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reenviar la invitación.");
    } finally {
      setResendSavingId(null);
    }
  }

  async function handleRevokeInvitation() {
    if (!pendingDelete || pendingDelete.kind !== "invitation") return;
    try {
      await revokeTeamInvitationViaProxy(pendingDelete.id);
      updateTeam((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      toast.success("Invitación eliminada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la invitación.");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleRemoveSeller(row: TeamMemberRow) {
    const sellerId = Number(row.id);
    if (!Number.isFinite(sellerId)) return;
    setRemoveSavingId(row.id);
    try {
      await removeTeamSellerViaProxy(sellerId);
      updateTeam((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Usuario eliminado del equipo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el usuario.");
    } finally {
      setRemoveSavingId(null);
    }
  }

  async function handleRoleChange(row: TeamMemberRow, nextRole: AssignableRole) {
    const sellerId = Number(row.id);
    if (!Number.isFinite(sellerId) || row.role === nextRole) return;
    setRoleSavingId(row.id);
    try {
      await patchTeamSellerRoleViaProxy(sellerId, nextRole);
      updateTeam((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, role: nextRole } : r)),
      );
      toast.success("Rol actualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el rol.");
    } finally {
      setRoleSavingId(null);
    }
  }

  const memberCountLabel =
    team.length === 1 ? "1 miembro en tu equipo" : `${team.length} miembros en tu equipo`;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">{memberCountLabel}</p>
          <div className="flex items-center gap-2">
            {loading ? <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
            {canInvite ? (
              <Button className="gap-2" size="sm" type="button" onClick={() => setInviteOpen(true)}>
                <UserPlus aria-hidden className="size-4" />
                Invitar
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button className="gap-2" disabled size="sm" type="button" variant="outline">
                      <UserPlus aria-hidden className="size-4" />
                      Invitar
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>No tenés permiso para invitar usuarios.</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[140px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.length === 0 ? (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground text-sm" colSpan={5}>
                    No hay miembros en el equipo.
                  </TableCell>
                </TableRow>
              ) : (
                team.map((row) => {
                  const isSelf = row.kind === "seller" && Number(row.id) === actorSellerId;
                  const isOwner = normalizeRole(row.role) === "owner";
                  const roleEditable =
                    row.state === "registered" &&
                    canEditRole &&
                    canEditTargetRole(actorRole, row.role) &&
                    !isSelf &&
                    !isOwner;
                  const removable =
                    row.state === "registered" &&
                    canRemove &&
                    !isOwner &&
                    !isSelf &&
                    canEditTargetRole(actorRole, row.role);

                  return (
                    <TableRow key={`${row.kind}-${row.id}`}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell>
                        {row.state === "registered" && roleEditable ? (
                          <Select
                            disabled={roleSavingId === row.id}
                            value={normalizeRole(row.role) ?? "seller"}
                            onValueChange={(value) =>
                              handleRoleChange(row, value as AssignableRole)
                            }
                          >
                            <SelectTrigger className="w-[160px]" size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {roleLabel(r)}
                                </SelectItem>
                              ))}
                              {normalizeRole(row.role) === "owner" ? (
                                <SelectItem disabled value="owner">
                                  {roleLabel("owner")}
                                </SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{roleLabel(row.role)}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("font-normal", stateBadgeClass(row.state))} variant="outline">
                          {teamStateLabel(row.state)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.state === "pending" && canInvite ? (
                          <Button
                            disabled={resendSavingId === row.id}
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => void handleResendInvitation(row)}
                          >
                            {resendSavingId === row.id ? (
                              <Loader2 aria-hidden className="mr-1 size-4 animate-spin" />
                            ) : (
                              <Mail aria-hidden className="mr-1 size-4" />
                            )}
                            Reenviar
                          </Button>
                        ) : null}
                        {row.state === "pending" && canRemove ? (
                          <Button
                            className="text-destructive hover:text-destructive"
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => setPendingDelete(row)}
                          >
                            <Trash2 aria-hidden className="mr-1 size-4" />
                            Eliminar
                          </Button>
                        ) : null}
                        {removable ? (
                          <Button
                            disabled={removeSavingId === row.id}
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => void handleRemoveSeller(row)}
                          >
                            {removeSavingId === row.id ? (
                              <Loader2 aria-hidden className="mr-1 size-4 animate-spin" />
                            ) : (
                              <UserMinus aria-hidden className="mr-1 size-4" />
                            )}
                            Quitar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <TeamInviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={(row) => {
          updateTeam((prev) => {
            const withoutDup = prev.filter(
              (r) => !(r.kind === "invitation" && r.email.toLowerCase() === row.email.toLowerCase()),
            );
            return [row, ...withoutDup];
          });
          void refreshTeam();
        }}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar invitación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se revocará la invitación para{" "}
              <span className="font-medium text-foreground">{pendingDelete?.email}</span>. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void handleRevokeInvitation()}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
