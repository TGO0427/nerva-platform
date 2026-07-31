import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Groups related fields under a heading, without wrapping every section in its own card. */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('py-5 border-t border-surface-border dark:border-surface-dark-border first:border-t-0 first:pt-0', className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary dark:text-text-dark-primary">{title}</h2>
        {description && (
          <p className="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** Consistent required-field marker to use next to a Label's text. */
export function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}
