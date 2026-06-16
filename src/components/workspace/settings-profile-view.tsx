"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SellerMe } from "@/lib/dashboard-types";
import { changePasswordViaProxy, patchSellerProfileViaProxy } from "@/lib/profile";
import { invalidateWorkspaceBootstrapCache } from "@/lib/workspace-bootstrap";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propietario",
  operator: "Administrador",
  admin: "Administrador",
  seller: "Vendedor",
  sales: "Vendedor",
  marketing: "Marketing",
};

function roleLabel(role: string): string {
  return ROLE_LABEL[role.trim().toLowerCase()] ?? role;
}

export function SettingsProfileView({
  seller,
}: Readonly<{ seller: SellerMe["seller"] }>) {
  const router = useRouter();

  const [name, setName] = useState(seller.name ?? "");
  const [phone, setPhone] = useState(seller.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const profileDirty =
    name.trim() !== (seller.name ?? "").trim() || phone.trim() !== (seller.phone ?? "").trim();

  async function saveProfile() {
    if (!profileDirty || savingProfile) return;
    if (name.trim().length === 0) {
      toast.error("El nombre no puede quedar vacío.");
      return;
    }
    setSavingProfile(true);
    try {
      await patchSellerProfileViaProxy({ name: name.trim(), phone: phone.trim() });
      invalidateWorkspaceBootstrapCache();
      toast.success("Perfil actualizado.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (savingPassword) return;
    if (!currentPassword || !newPassword) {
      toast.error("Ingresá la contraseña actual y la nueva.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePasswordViaProxy({ currentPassword, newPassword });
      toast.success("Contraseña actualizada.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Tu información personal en Zumo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Correo</Label>
            <Input disabled readOnly value={seller.email} />
            <p className="text-muted-foreground text-xs">El correo no se puede cambiar.</p>
          </div>

          <div className="grid gap-1.5">
            <Label>Rol</Label>
            <div>
              <Badge variant="secondary">{roleLabel(seller.role)}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Los roles se administran en Permisos del equipo.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              value={name}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <Input
              id="profile-phone"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+506 8888 8888"
              type="tel"
              value={phone}
            />
          </div>

          <div className="flex justify-end">
            <Button disabled={!profileDirty || savingProfile} onClick={() => void saveProfile()} type="button">
              {savingProfile ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>Usá al menos 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <Input
              autoComplete="current-password"
              id="current-password"
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              value={currentPassword}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              autoComplete="new-password"
              id="new-password"
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              value={newPassword}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <Input
              autoComplete="new-password"
              id="confirm-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              value={confirmPassword}
            />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              onClick={() => void savePassword()}
              type="button"
            >
              {savingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Actualizar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
