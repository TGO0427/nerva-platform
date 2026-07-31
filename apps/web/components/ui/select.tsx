import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'block w-full h-9 rounded-md border bg-surface-card px-3 text-sm text-text-primary transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-secondary',
            'dark:bg-surface-dark-card dark:text-text-dark-primary dark:disabled:bg-surface-dark-secondary',
            error
              ? 'border-danger focus:border-danger focus:ring-danger'
              : 'border-surface-border focus:border-primary-500 focus:ring-primary-500 dark:border-surface-dark-border',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
