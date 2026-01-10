import { forwardRef, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const TypographyList = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => {
    return <ul ref={ref} className={cn('my-6 ml-6 list-disc [&>li]:mt-2', className)} {...props} />;
  },
);
TypographyList.displayName = 'TypographyList';

export { TypographyList };
