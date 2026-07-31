import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'block w-full rounded-md border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-secondary',
            'dark:bg-surface-dark-card dark:text-text-dark-primary dark:placeholder-text-dark-muted dark:disabled:bg-surface-dark-secondary',
            error
              ? 'border-danger focus:border-danger focus:ring-danger'
              : 'border-surface-border focus:border-primary-500 focus:ring-primary-500 dark:border-surface-dark-border',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
