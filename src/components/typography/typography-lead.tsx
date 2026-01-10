import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TypographyLead = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn("text-muted-foreground text-xl", className)} {...props} />;
  },
);
TypographyLead.displayName = "TypographyLead";

export { TypographyLead };
