"use client";

import { useState } from "react";

import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardCustomerContact } from "@/lib/dashboard-customers";

function formatCreatedAt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function CustomerUsersTab({
  contacts,
  pendingContacts,
  onAddPendingContact,
}: Readonly<{
  contacts: readonly DashboardCustomerContact[];
  pendingContacts: ReadonlyArray<{
    tempId: string;
    name: string;
    email: string;
    phone: string;
  }>;
  onAddPendingContact: (contact: { name: string; email: string; phone: string }) => void;
}>) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  const allRows = [
    ...contacts.map((c) => ({
      key: c.contactId,
      name: c.name,
      phone: c.phone,
      email: c.email ?? "—",
      createdAt: formatCreatedAt(c.createdAt),
      pending: false,
    })),
    ...pendingContacts.map((c) => ({
      key: c.tempId,
      name: c.name,
      phone: c.phone,
      email: c.email,
      createdAt: "Pendiente de guardar",
      pending: true,
    })),
  ];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    setAdding(true);
    onAddPendingContact({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
    setName("");
    setEmail("");
    setPhone("");
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      <form className="rounded-lg border bg-card p-4 shadow-sm" onSubmit={handleAdd}>
        <h3 className="mb-4 font-medium text-sm">Agregar contacto (POC)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="poc-name">Nombre</Label>
            <Input
              id="poc-name"
              placeholder="Nombre del contacto"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poc-email">Correo</Label>
            <Input
              id="poc-email"
              placeholder="correo@empresa.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poc-phone">Teléfono</Label>
            <Input
              id="poc-phone"
              placeholder="+506 8888 8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <Button className="gap-1.5" disabled={adding} size="sm" type="submit">
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar contacto
          </Button>
        </div>
      </form>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allRows.length === 0 ? (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>
                  No hay contactos registrados.
                </TableCell>
              </TableRow>
            ) : (
              allRows.map((row) => (
                <TableRow className={row.pending ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined} key={row.key}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.phone || "—"}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.createdAt}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
