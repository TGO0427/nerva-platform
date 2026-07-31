import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

function cn(...inputs: (string | undefined | false)[]) {
  return twMerge(clsx(inputs));
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'block w-full h-9 rounded-md border bg-surface-card px-3 text-sm text-text-primary placeholder-text-muted transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-secondary',
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

Input.displayName = 'Input';
