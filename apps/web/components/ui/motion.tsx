'use client';

import { motion, HTMLMotionProps, AnimatePresence, useReducedMotion } from 'framer-motion';
import { forwardRef, ReactNode, createContext, useContext } from 'react';
import { durations, springs, pageVariants, pageTransition } from '@/lib/motion';

// Reduced motion context
const ReducedMotionContext = createContext(false);

export function useMotionPreference() {
  return useContext(ReducedMotionContext);
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion();
  return (
    <ReducedMotionContext.Provider value={prefersReduced ?? false}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

// Page transition wrapper with AnimatePresence support
interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className = '' }: PageShellProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: durations.medium, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Wrapper for route transitions
interface PageTransitionProps {
  children: ReactNode;
  routeKey: string;
}

export function PageTransition({ children, routeKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <PageShell key={routeKey}>{children}</PageShell>
    </AnimatePresence>
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

// Animated list with layout animations for filtering/sorting
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div className={className}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Individual list item with layout animation
interface AnimatedListItemProps {
  children: ReactNode;
  id: string;
  className?: string;
}

export function AnimatedListItem({ children, id, className = '' }: AnimatedListItemProps) {
  return (
    <motion.div
      layout
      layoutId={id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: durations.fast } }}
      transition={springs.snappy}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Attention animation for critical alerts (one-time shake)
interface AttentionProps {
  children: ReactNode;
  trigger?: boolean;
  className?: string;
}

export function Attention({ children, trigger = false, className = '' }: AttentionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={trigger ? { x: [0, -3, 3, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Collapsible sidebar wrapper
interface CollapsibleSidebarProps {
  children: ReactNode;
  collapsed: boolean;
  className?: string;
}

export function CollapsibleSidebar({ children, collapsed, className = '' }: CollapsibleSidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={springs.snappy}
      className={className}
    >
      {children}
    </motion.aside>
  );
}

// Tooltip wrapper for collapsed sidebar items
interface TooltipProps {
  children: ReactNode;
  content: string;
  side?: 'left' | 'right';
}

export function Tooltip({ children, content, side = 'right' }: TooltipProps) {
  return (
    <div className="relative group">
      {children}
      <div
        className={`absolute ${side === 'right' ? 'left-full ml-2' : 'right-full mr-2'} top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50`}
      >
        {content}
      </div>
    </div>
  );
}
