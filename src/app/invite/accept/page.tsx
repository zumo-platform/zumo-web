"use client";

import { Suspense, useEffect, useState } from "react";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ZumoWordmark } from "@/components/branding/zumo-logos";
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
import { roleLabel } from "@/lib/roles";
import { acceptInvite, validateInviteToken, type InviteValidation } from "@/lib/team";

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          autoComplete="new-password"
          className="pr-10"
          disabled={disabled}
          id={id}
          required
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          disabled={disabled}
          type="button"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function InviteAcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setValidation({ valid: false, message: "Esta invitación ya no es válida." });
      setLoading(false);
      return;
    }
    let cancelled = false;
    void validateInviteToken(token).then((result) => {
      if (cancelled) return;
      setValidation(result);
      if (result.valid && result.name) setName(result.name);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validation?.valid || !token) return;
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await acceptInvite({ token, name: name.trim(), password });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const loginEmail = result.email || validation.email || "";
      if (!loginEmail) {
        toast.error("Cuenta creada. Iniciá sesión con tu correo y contraseña.");
        router.push("/login");
        return;
      }
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password }),
      });
      if (!loginRes.ok) {
        const body = (await loginRes.json().catch(() => ({}))) as { message?: string };
        toast.error(body.message ?? "Cuenta creada. Iniciá sesión con tu correo y contraseña.");
        router.push("/login");
        return;
      }
      toast.success("¡Bienvenido a Zumo!");
      router.push("/whatsapp");
    } catch {
      toast.error("No se pudo completar el registro.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
        <Loader2 aria-hidden className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!validation?.valid) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ZumoWordmark className="mx-auto mb-4 max-h-10" />
            <CardTitle>Invitación no válida</CardTitle>
            <CardDescription>
              {validation?.message ?? "Esta invitación ya no es válida."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button type="button" variant="outline" onClick={() => router.push("/login")}>
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ZumoWordmark className="mx-auto mb-4 max-h-10" />
          <CardTitle>Únete a {validation.supplierName ?? "tu equipo"}</CardTitle>
          <CardDescription>
            {validation.inviterName
              ? `${validation.inviterName} te invitó a unirte a la plataforma Zumo.`
              : "Completá tu registro para acceder a la plataforma Zumo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="invite-accept-name">Nombre</Label>
              <Input
                autoComplete="name"
                id="invite-accept-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-accept-email">Correo</Label>
              <Input
                disabled
                id="invite-accept-email"
                readOnly
                type="email"
                value={validation.email ?? ""}
              />
            </div>
            {validation.role ? (
              <div className="space-y-2">
                <Label htmlFor="invite-accept-role">Rol</Label>
                <Input
                  disabled
                  id="invite-accept-role"
                  readOnly
                  value={roleLabel(validation.role)}
                />
              </div>
            ) : null}
            <PasswordField
              disabled={submitting}
              id="invite-accept-password"
              label="Contraseña"
              value={password}
              onChange={setPassword}
            />
            <PasswordField
              disabled={submitting}
              id="invite-accept-confirm"
              label="Confirmar contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? (
                <>
                  <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                  Creando cuenta…
                </>
              ) : (
                "Crear cuenta y entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
          <Loader2 aria-hidden className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
