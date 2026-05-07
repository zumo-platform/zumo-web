import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WorkspacePageHeader({
  title,
  description,
  className,
  children,
}: Readonly<{
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}>) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 border-b bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="truncate font-semibold text-lg tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
