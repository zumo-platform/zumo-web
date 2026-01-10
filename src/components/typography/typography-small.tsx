import { forwardRef, HTMLAttributes } from "react"

import { cn } from "@/lib/utils";

const TypographySmall = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  return <small ref={ref} className={cn("text-sm leading-none font-medium", className)} {...props} />;
});
TypographySmall.displayName = "TypographySmall";

export { TypographySmall };
