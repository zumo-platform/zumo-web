import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TypographyH2 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn("scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0", className)}
        {...props}
      />
    );
  },
);
TypographyH2.displayName = "TypographyH2";

export { TypographyH2 };
