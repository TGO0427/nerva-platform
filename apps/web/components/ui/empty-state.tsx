import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'dashed' | 'compact';
  className?: string;
}

export function EmptyState({ icon, title, description, action, variant = 'default', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-center',
        variant === 'compact' ? 'py-8' : 'py-12',
        variant === 'dashed' && 'border-2 border-dashed border-surface-border dark:border-surface-dark-border rounded-lg',
        variant === 'default' && 'px-6',
        className
      )}
    >
      {icon && (
        <div className={cn('mx-auto text-text-muted dark:text-text-dark-muted', variant === 'compact' ? 'mb-3 h-10 w-10' : 'mb-4 h-12 w-12')}>
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-text-primary dark:text-text-dark-primary">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-text-muted dark:text-text-dark-muted">{description}</p>
      )}
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  );
}
