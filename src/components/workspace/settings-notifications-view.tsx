"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_NOTIFICATION_PREFS,
  fetchNotificationPrefs,
  saveNotificationPrefs,
} from "@/lib/notifications/preferences";
import type { NotificationPrefs } from "@/lib/notifications/types";
import { useWorkspacePermissions } from "@/lib/workspace-preferences-context";

const ROWS: ReadonlyArray<{
  key: Exclude<keyof NotificationPrefs, "notifyEnabled">;
  title: string;
  descAdmin: string;
  descSeller: string;
  rail: string;
}> = [
  {
    key: "notifyOrders",
    title: "Pedidos",
    descAdmin: "Te avisamos de todos los pedidos nuevos.",
    descSeller: "Te avisamos de los pedidos de tus clientes.",
    rail: "bg-blue-500",
  },
  {
    key: "notifyDraftOrders",
    title: "Borradores de pedido",
    descAdmin: "Te avisamos de todos los borradores creados.",
    descSeller: "Te avisamos de los borradores de tus clientes.",
    rail: "bg-muted-foreground/50",
  },
  {
    key: "notifyReclamos",
    title: "Reclamos / errores",
    descAdmin: "Te avisamos de todos los reclamos y errores.",
    descSeller: "Te avisamos de los reclamos de tus clientes.",
    rail: "bg-red-500",
  },
];

export function SettingsNotificationsView() {
  const { can } = useWorkspacePermissions();
  const isAdmin = can("orders.view_all");

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchNotificationPrefs().then((p) => {
      if (active) {
        setPrefs(p);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function toggle(key: keyof NotificationPrefs, value: boolean) {
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      const next = await saveNotificationPrefs({ [key]: value });
      setPrefs(next);
    } catch {
      setPrefs(prev);
      toast.error("No se pudieron guardar las preferencias");
    }
  }

  const masterOff = !prefs.notifyEnabled;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">Notificaciones</h2>
        <p className="text-muted-foreground text-sm">
          Elegí qué alertas querés ver mientras trabajás en ZUMO.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <div className="min-w-0 flex-1">
          <Label className="font-medium text-sm">Activar notificaciones</Label>
          <p className="text-muted-foreground text-xs">
            Cuando está desactivado, no recibís ninguna alerta en ZUMO.
          </p>
        </div>
        <Switch
          checked={prefs.notifyEnabled}
          disabled={loading}
          onCheckedChange={(v) => void toggle("notifyEnabled", v)}
        />
      </div>

      <div
        className={`divide-y rounded-lg border transition-opacity ${
          masterOff ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center gap-3 p-4">
            <span aria-hidden className={`h-8 w-1.5 shrink-0 rounded-full ${row.rail}`} />
            <div className="min-w-0 flex-1">
              <Label className="font-medium text-sm">{row.title}</Label>
              <p className="text-muted-foreground text-xs">
                {isAdmin ? row.descAdmin : row.descSeller}
              </p>
            </div>
            <Switch
              checked={prefs[row.key]}
              disabled={loading || masterOff}
              onCheckedChange={(v) => void toggle(row.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
