import { forwardRef, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const TypographyP = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('leading-7 not-first:mt-6', className)} {...props} />;
  },
);
TypographyP.displayName = 'TypographyP';

export { TypographyP };
