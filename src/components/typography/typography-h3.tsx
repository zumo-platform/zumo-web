import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TypographyH3 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return <h3 ref={ref} className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)} {...props} />;
  },
);
TypographyH3.displayName = "TypographyH3";

export { TypographyH3 };
