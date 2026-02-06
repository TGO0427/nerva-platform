// Centralized motion tokens for consistent animations across the app

import { useReducedMotion } from 'framer-motion';

// Duration tokens
export const durations = {
  fast: 0.18,
  medium: 0.25,
  slow: 0.4,
} as const;

// Spring configurations
export const springs = {
  snappy: { type: 'spring' as const, stiffness: 500, damping: 35 },
  gentle: { type: 'spring' as const, stiffness: 300, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 700, damping: 35 },
} as const;

// Easing functions
export const easings = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
} as const;

// Standard transitions
export const transitions = {
  fast: { duration: durations.fast, ease: easings.easeOut },
  medium: { duration: durations.medium, ease: easings.easeOut },
  spring: springs.snappy,
  gentle: springs.gentle,
} as const;

// Page transition variants
export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const pageTransition = {
  duration: durations.medium,
  ease: easings.easeOut,
};

// Stagger variants for grids/lists
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.fast,
  },
};

// List/table row variants with layout support
export const listItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20, transition: { duration: durations.fast } },
};

// Modal variants
export const modalOverlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springs.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: durations.fast },
  },
};

// Drawer variants (slide from right)
export const drawerVariants = {
  initial: { x: '100%' },
  animate: {
    x: 0,
    transition: springs.snappy,
  },
  exit: {
    x: '100%',
    transition: { duration: durations.medium },
  },
};

// Toast variants (slide from bottom-right)
export const toastVariants = {
  initial: { opacity: 0, y: 50, x: 0 },
  animate: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: springs.snappy,
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: durations.fast },
  },
};

// Attention variants (for alerts - single shake)
export const attentionVariants = {
  initial: { x: 0 },
  attention: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4, ease: 'easeInOut' as const },
  },
};

// Hover effects
export const hoverLift = {
  y: -2,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export const hoverScale = {
  scale: 1.02,
};

export const tapScale = {
  scale: 0.98,
};

// Hook for reduced motion support
export function useMotionSafe() {
  const prefersReducedMotion = useReducedMotion();

  return {
    prefersReducedMotion,
    // Return no-motion variants when reduced motion is preferred
    getVariants: <T extends Record<string, unknown>>(variants: T): T | Record<string, unknown> => {
      if (prefersReducedMotion) {
        // Strip out y, x, scale transforms, keep opacity
        const safeVariants: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(variants)) {
          if (typeof value === 'object' && value !== null) {
            const { y, x, scale, ...rest } = value as Record<string, unknown>;
            safeVariants[key] = { ...rest, transition: { duration: 0 } };
          } else {
            safeVariants[key] = value;
          }
        }
        return safeVariants;
      }
      return variants;
    },
    // Get transition based on preference
    getTransition: (transition: typeof transitions.fast | typeof transitions.spring) => {
      if (prefersReducedMotion) {
        return { duration: 0 };
      }
      return transition;
    },
  };
}
