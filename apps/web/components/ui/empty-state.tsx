import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'dashed';
  className?: string;
}

export function EmptyState({ icon, title, description, action, variant = 'default', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-center py-12',
        variant === 'dashed' && 'border-2 border-dashed border-slate-200 rounded-xl',
        className
      )}
    >
      {icon && (
        <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  );
}
