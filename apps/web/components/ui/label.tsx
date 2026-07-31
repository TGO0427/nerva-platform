import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1.5',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';
