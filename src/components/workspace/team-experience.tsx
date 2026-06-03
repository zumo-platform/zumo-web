"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsSellersTable } from "@/components/workspace/settings-sellers-table";
import { TeamInviteSheet } from "@/components/workspace/team-invite-sheet";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { fetchTeamViaProxy, type TeamMemberRow } from "@/lib/team";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

export function TeamExperience() {
  const { can } = useWorkspacePermissions();
  const canInvite = can("users.invite");
  const [team, setTeam] = useState<TeamMemberRow[] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoadState("loading");
    const rows = await fetchTeamViaProxy();
    if (rows === null) {
      setLoadState("error");
      return;
    }
    setTeam(rows);
    setLoadState("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchTeamViaProxy().then((rows) => {
      if (cancelled) return;
      if (rows === null) {
        setLoadState("error");
        return;
      }
      setTeam(rows);
      setLoadState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <WorkspacePageHeader
        description="Invitá a tu equipo, asigná roles y gestioná el acceso de cada miembro."
        title="Vendedores"
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-4xl p-6">
          {loadState === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
              <Loader2 aria-hidden className="size-5 animate-spin" />
              Cargando equipo…
            </div>
          ) : null}

          {loadState === "error" ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-sm">
                No pudimos cargar el equipo. Revisá tu sesión e intentá de nuevo.
              </p>
              <Button className="mt-4" size="sm" type="button" variant="outline" onClick={() => void loadTeam()}>
                Reintentar
              </Button>
            </div>
          ) : null}

          {loadState === "ready" && team && team.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <h2 className="font-semibold text-xl tracking-tight">Invitá tu equipo a Zumo</h2>
              <p className="mt-3 max-w-md text-muted-foreground text-sm leading-relaxed">
                Sumá procesadores, vendedores y representantes de clientes para gestionar pedidos y
                la comunicación con tus clientes desde un solo lugar.
              </p>
              {canInvite ? (
                <Button className="mt-8 gap-2" type="button" onClick={() => setInviteOpen(true)}>
                  <UserPlus aria-hidden className="size-4" />
                  Invitar miembro
                </Button>
              ) : (
                <p className="mt-8 text-muted-foreground text-sm">
                  No tenés permiso para invitar usuarios.
                </p>
              )}
            </div>
          ) : null}

          {loadState === "ready" && team && team.length > 0 ? (
            <SettingsSellersTable initialTeam={team} onTeamChange={setTeam} />
          ) : null}
        </div>
      </div>

      <TeamInviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={(row) => {
          setTeam((prev) => {
            const base = prev ?? [];
            const withoutDup = base.filter(
              (r) => !(r.kind === "invitation" && r.email.toLowerCase() === row.email.toLowerCase()),
            );
            return [row, ...withoutDup];
          });
          setLoadState("ready");
          void loadTeam();
        }}
      />
    </div>
  );
}
