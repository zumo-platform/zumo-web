import Image from "next/image";

import { cn } from "@/lib/utils";

export const BRANDING_WORDMARK_SRC = "/branding/zumo-wordmark.png";
export const BRANDING_ISOTYPE_SRC = "/branding/zumo-isotype.png";

type ImgProps = Readonly<{
  className?: string;
  priority?: boolean;
}>;

/** Full “Zumo” wordmark — use in headers, auth card, footer. */
export function ZumoWordmark({ className, priority }: ImgProps) {
  return (
    <Image
      alt="Zumo"
      className={cn("h-7 w-auto max-w-[140px] object-contain object-left md:h-8 md:max-w-[160px]", className)}
      height={40}
      priority={priority}
      src={BRANDING_WORDMARK_SRC}
      width={160}
    />
  );
}

/** Z isotype only — collapsed sidebar, favicon-style contexts. */
export function ZumoIsotype({ className, priority }: ImgProps) {
  return (
    <Image
      alt=""
      aria-hidden
      className={cn("size-8 object-contain", className)}
      height={32}
      priority={priority}
      src={BRANDING_ISOTYPE_SRC}
      width={32}
    />
  );
}
