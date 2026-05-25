"use client";

import { useState } from "react";

import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function CustomerDraftField({
  label,
  value,
  placeholder,
  multiline = false,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (next: string) => void;
}>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const display = value.trim() || "—";
  const isEmpty = !value.trim();

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function save() {
    onChange(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
        <div className="flex flex-wrap items-start gap-2">
          {multiline ? (
            <Textarea
              autoFocus
              className="min-h-16 flex-1 text-sm"
              placeholder={placeholder ?? label}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <Input
              autoFocus
              className="h-8 flex-1 text-sm"
              placeholder={placeholder ?? label}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          )}
          <Button size="icon-sm" type="button" variant="outline" onClick={save}>
            <Check className="size-3.5" />
          </Button>
          <Button size="icon-sm" type="button" variant="ghost" onClick={() => setEditing(false)}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <div className="flex items-start gap-1.5">
        <span className={cn("text-sm", isEmpty && "text-muted-foreground")}>{display}</span>
        <Button
          aria-label={`Editar ${label}`}
          className="size-7 shrink-0"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={startEdit}
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

export function CustomerDraftReadonly({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value.trim() || "—"}</p>
    </div>
  );
}
