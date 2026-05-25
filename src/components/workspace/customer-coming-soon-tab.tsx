"use client";

import { Clock } from "lucide-react";

export function CustomerComingSoonTab({
  title,
}: Readonly<{ title: string }>) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Clock aria-hidden className="size-10 text-muted-foreground" />
      <p className="font-medium text-foreground text-sm">{title}</p>
      <p className="max-w-sm text-muted-foreground text-sm">
        Esta sección estará disponible próximamente.
      </p>
    </div>
  );
}
