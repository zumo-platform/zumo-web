"use client";

import { useEffect, useMemo, useState } from "react";

import { Copy, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ASSIGNABLE_ROLES,
  roleLabel,
  type AssignableRole,
} from "@/lib/roles";
import {
  createTeamInvitationViaProxy,
  fetchAssignableCustomersViaProxy,
  type AssignableCustomer,
  type TeamMemberRow,
} from "@/lib/team";

type ManualShareState = Readonly<{
  acceptUrl: string;
  email: string;
  message: string;
}>;

export function TeamInviteSheet({
  open,
  onOpenChange,
  onInvited,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: (row: TeamMemberRow) => void;
}>) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("seller");
  const [customers, setCustomers] = useState<AssignableCustomer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(() => new Set());
  const [customerQuery, setCustomerQuery] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualShare, setManualShare] = useState<ManualShareState | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setRole("seller");
    setSelectedCustomerIds(new Set());
    setCustomerQuery("");
    setManualShare(null);
    setLoadingCustomers(true);
    void fetchAssignableCustomersViaProxy()
      .then(setCustomers)
      .finally(() => setLoadingCustomers(false));
  }, [open]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, customerQuery]);

  function toggleCustomer(customerId: number) {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  }

  async function copyAcceptUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.message("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!email.trim()) {
      toast.error("El correo es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const { row, acceptUrl, emailSent, emailMessage } = await createTeamInvitationViaProxy({
        name: name.trim(),
        email: email.trim(),
        role,
        assignedCustomerIds: [...selectedCustomerIds],
      });
      onInvited(row);

      if (emailSent) {
        toast.success(`Invitación enviada a ${row.email}.`);
        onOpenChange(false);
        return;
      }

      if (acceptUrl) {
        setManualShare({
          acceptUrl,
          email: row.email,
          message:
            emailMessage ??
            "No pudimos enviar el correo automáticamente. Compartí este enlace con la persona para que se registre:",
        });
        return;
      }

      toast.success("Invitación creada.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar la invitación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Invitar al equipo</SheetTitle>
          <SheetDescription>
            Enviá una invitación por correo. Podés asignar clientes al vendedor de forma opcional.
          </SheetDescription>
        </SheetHeader>

        {manualShare ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
            <Alert>
              <AlertTitle>Invitación creada</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{manualShare.message}</p>
                <div className="space-y-2">
                  <Label htmlFor="invite-manual-url">Enlace de registro</Label>
                  <div className="flex gap-2">
                    <Input
                      className="font-mono text-xs"
                      id="invite-manual-url"
                      readOnly
                      value={manualShare.acceptUrl}
                    />
                    <Button
                      aria-label="Copiar enlace"
                      size="icon"
                      type="button"
                      variant="outline"
                      onClick={() => void copyAcceptUrl(manualShare.acceptUrl)}
                    >
                      <Copy aria-hidden className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  {manualShare.email} aparecerá como pendiente hasta que complete el registro.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nombre</Label>
              <Input
                autoComplete="name"
                id="invite-name"
                placeholder="María García"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Correo</Label>
              <Input
                autoComplete="email"
                id="invite-email"
                placeholder="maria@empresa.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AssignableRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Clientes (opcional)</Label>
              <p className="text-muted-foreground text-xs">
                Podés asignar uno o más clientes al vendedor antes de que se registre.
              </p>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-9"
                  placeholder="Buscar cliente…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-48 rounded-md border">
                {loadingCustomers ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                    Cargando clientes…
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    No hay clientes disponibles.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {filteredCustomers.map((customer) => {
                      const checked = selectedCustomerIds.has(customer.customerId);
                      return (
                        <li key={customer.customerId}>
                          <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleCustomer(customer.customerId)}
                            />
                            <span className="truncate text-sm">{customer.name}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
              {selectedCustomerIds.size > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {selectedCustomerIds.size === 1
                    ? "1 cliente seleccionado"
                    : `${selectedCustomerIds.size} clientes seleccionados`}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <SheetFooter className="border-t pt-4">
          {manualShare ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          ) : (
            <>
              <Button disabled={saving} type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button disabled={saving} type="button" onClick={() => void handleSubmit()}>
                {saving ? (
                  <>
                    <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  "Enviar invitación"
                )}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
