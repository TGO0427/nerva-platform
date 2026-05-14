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
        variant === 'dashed' && 'border-2 border-dashed border-slate-200 rounded-xl',
        variant === 'default' && 'px-6',
        className
      )}
    >
      {icon && (
        <div className={cn('mx-auto text-slate-400', variant === 'compact' ? 'mb-3 h-10 w-10' : 'mb-4 h-12 w-12')}>
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
      )}
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  );
}
