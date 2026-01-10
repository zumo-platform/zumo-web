import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TypographyH4 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return <h4 ref={ref} className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)} {...props} />;
  },
);
TypographyH4.displayName = "TypographyH4";

export { TypographyH4 };
