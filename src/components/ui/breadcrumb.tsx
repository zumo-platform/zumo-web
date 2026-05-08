import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export const Breadcrumb = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"nav">>(
  function Breadcrumb({ className, ...props }, ref) {
    return <nav aria-label="breadcrumb" className={cn(className)} ref={ref} {...props} />;
  },
);

export const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
  function BreadcrumbList({ className, ...props }, ref) {
    return (
      <ol
        className={cn(
          "flex flex-wrap items-center gap-2 break-words text-muted-foreground text-sm sm:gap-2.5",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

export const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  function BreadcrumbItem({ className, ...props }, ref) {
    return <li className={cn("inline-flex items-center gap-2", className)} ref={ref} {...props} />;
  },
);

export const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & { asChild?: boolean }
>(function BreadcrumbLink({ className, asChild, ...props }, ref) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      className={cn("transition-colors hover:text-foreground", className)}
      ref={ref}
      {...props}
    />
  );
});

export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li">) {
  return (
    <li aria-hidden className={cn("[&>svg]:size-3.5", className)} role="presentation" {...props}>
      {children ?? <ChevronRight />}
    </li>
  );
}

export const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  function BreadcrumbPage({ className, ...props }, ref) {
    return (
      <span
        aria-current="page"
        aria-disabled="true"
        className={cn("font-normal text-foreground", className)}
        ref={ref}
        role="link"
        {...props}
      />
    );
  },
);
