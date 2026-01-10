import { forwardRef, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const TypographyH1 = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h1
        ref={ref}
        className={cn("scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl", className)}
        {...props}
      />
    );
  },
);
TypographyH1.displayName = "TypographyH1";

export { TypographyH1 };
