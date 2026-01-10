import { forwardRef } from "react";
import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TypographyInlineCode = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  return (
    <code
      ref={ref}
      className={cn("bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold", className)}
      {...props}
    />
  );
});
TypographyInlineCode.displayName = "TypographyInlineCode";

export { TypographyInlineCode };
