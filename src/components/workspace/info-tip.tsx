"use client";

import { CircleHelp } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoTip({
  label,
  text,
}: Readonly<{
  label?: string;
  text: string;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label ? `Ayuda: ${label}` : "Ayuda"}
          className="inline-flex rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <CircleHelp aria-hidden className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
