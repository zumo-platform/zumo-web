"use client";

import { useState } from "react";

import { Check, Loader2, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditableCustomerTextField({
  value,
  fallbackDisplay,
  placeholder,
  onSave,
  showEditWhenEmptyOnly = true,
}: Readonly<{
  value: string | null;
  /** Shown when `value` is empty (e.g. trade name while legal name is unset). */
  fallbackDisplay?: string | null;
  placeholder: string;
  onSave: (next: string) => Promise<void>;
  showEditWhenEmptyOnly?: boolean;
}>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const hasValue = Boolean(value?.trim());
  const display = value?.trim() || fallbackDisplay?.trim() || "—";
  const isEmpty = !hasValue;
  const showPencil = showEditWhenEmptyOnly ? isEmpty : true;

  async function save() {
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          autoFocus
          className="h-8 max-w-xs text-sm"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button disabled={saving} size="icon-sm" type="button" variant="outline" onClick={() => void save()}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        </Button>
        <Button disabled={saving} size="icon-sm" type="button" variant="ghost" onClick={() => setEditing(false)}>
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(!hasValue && !fallbackDisplay?.trim() && "text-muted-foreground")}
      >
        {display}
      </span>
      {showPencil ? (
        <Button
          aria-label={`Editar ${placeholder}`}
          className="size-7 shrink-0"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => {
            setDraft(value?.trim() ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </Button>
      ) : null}
    </span>
  );
}

export function EditableCustomerAddressField({
  addressLine1,
  city,
  region,
  onSave,
}: Readonly<{
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  onSave: (patch: {
    addressLine1: string;
    city: string;
    region: string;
  }) => Promise<void>;
}>) {
  const [editing, setEditing] = useState(false);
  const [line1, setLine1] = useState("");
  const [cityDraft, setCityDraft] = useState("");
  const [regionDraft, setRegionDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const parts = [addressLine1, city, region].filter((p): p is string => Boolean(p?.trim()));
  const display = parts.length > 0 ? parts.join(", ") : "—";
  const isEmpty = parts.length === 0;

  async function save() {
    setSaving(true);
    try {
      await onSave({
        addressLine1: line1.trim(),
        city: cityDraft.trim(),
        region: regionDraft.trim(),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Input
          autoFocus
          className="h-8 text-sm"
          placeholder="Dirección línea 1"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-8 flex-1 text-sm"
            placeholder="Cantón / ciudad"
            value={cityDraft}
            onChange={(e) => setCityDraft(e.target.value)}
          />
          <Input
            className="h-8 flex-1 text-sm"
            placeholder="Provincia"
            value={regionDraft}
            onChange={(e) => setRegionDraft(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button disabled={saving} size="sm" type="button" onClick={() => void save()}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Guardar"}
          </Button>
          <Button disabled={saving} size="sm" type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-start gap-1.5">
      <span className={cn(isEmpty && "text-muted-foreground")}>{display}</span>
      {isEmpty ? (
        <Button
          aria-label="Editar dirección de entrega"
          className="size-7 shrink-0"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => {
            setLine1(addressLine1?.trim() ?? "");
            setCityDraft(city?.trim() ?? "");
            setRegionDraft(region?.trim() ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </Button>
      ) : null}
    </span>
  );
}
