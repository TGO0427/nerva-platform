'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  alert?: boolean;
}

export function Card({ children, className, hover = false, alert = false }: CardProps) {
  const baseClass = cn(
    'bg-white rounded-2xl shadow-sm border',
    alert ? 'border-red-200' : 'border-slate-200',
    className
  );

  if (hover || alert) {
    return (
      <motion.div
        className={baseClass}
        initial={alert ? { opacity: 0, scale: 0.995 } : undefined}
        animate={alert ? { opacity: 1, scale: 1 } : undefined}
        whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        transition={{ type: 'spring', stiffness: 550, damping: 35 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClass}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 pt-5 pb-4', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-gray-500 mt-1', className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('px-6 pb-6', className)}>
      {children}
    </div>
  );
}
