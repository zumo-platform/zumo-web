import { forwardRef, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const TypographyBlockquote = forwardRef<HTMLQuoteElement, HTMLAttributes<HTMLQuoteElement>>(
  ({ className, ...props }, ref) => {
    return <blockquote ref={ref} className={cn('mt-6 border-l-2 pl-6 italic', className)} {...props} />;
  },
);
TypographyBlockquote.displayName = 'TypographyBlockquote';

export { TypographyBlockquote };
