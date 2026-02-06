'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef, ReactNode } from 'react';

// Page transition wrapper - fade + slight rise
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' as const }}
    >
      {children}
    </motion.div>
  );
}

// Grid variants for staggered card animations
const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.03 },
  },
};

const tileVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: 'easeOut' as const },
  },
};

// Staggered metric/KPI grid
interface MetricGridProps {
  children: ReactNode;
  className?: string;
}

export function MetricGrid({ children, className = '' }: MetricGridProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {childArray.map((child, i) => (
        <motion.div key={i} variants={tileVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Motion card with hover lift effect
interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className = '', hoverLift = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverLift ? { y: -2 } : undefined}
        transition={{ type: 'spring', stiffness: 550, damping: 35 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = 'MotionCard';

// Alert card with subtle urgency animation
interface AlertCardProps {
  children: ReactNode;
  className?: string;
}

export function AlertCard({ children, className = '' }: AlertCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.995 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Navigation item with animated active indicator
interface NavItemProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NavItem({
  active,
  icon,
  label,
  collapsed = false,
  onClick,
  className = '',
}: NavItemProps) {
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer ${className}`}
    >
      {active && (
        <motion.div
          layoutId="navActive"
          className="absolute inset-0 rounded-xl bg-primary-50"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <div className="relative z-10">{icon}</div>
      {!collapsed && (
        <span className="relative z-10 text-sm">{label}</span>
      )}
    </div>
  );
}

// Motion button with hover/tap feedback
export const MotionButton = motion.button;

// Button props helper for consistent animation
export const buttonMotionProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring', stiffness: 700, damping: 35 },
};

// Fade in animation wrapper
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.2,
  className = '',
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' as const }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide up animation wrapper
interface SlideUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function SlideUp({ children, delay = 0, className = '' }: SlideUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' as const }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// List item stagger wrapper
const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.15 } },
};

export function StaggerList({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {childArray.map((child, i) => (
        <motion.div key={i} variants={listItemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
