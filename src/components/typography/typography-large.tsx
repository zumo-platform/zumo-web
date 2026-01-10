import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TypographyLarge = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("text-lg font-semibold", className)} {...props} />;
});
TypographyLarge.displayName = "TypographyLarge";

export { TypographyLarge };
