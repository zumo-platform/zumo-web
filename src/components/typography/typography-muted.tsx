import { forwardRef, HTMLAttributes } from "react"

import { cn } from "@/lib/utils";

const TypographyMuted = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn("text-muted-foreground text-sm", className)} {...props} />;
  },
);
TypographyMuted.displayName = "TypographyMuted";

export { TypographyMuted };
