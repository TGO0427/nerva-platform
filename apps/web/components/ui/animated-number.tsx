'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  formatFn?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 500,
  delay = 0,
  decimals,
  formatFn,
  className = '',
}: AnimatedNumberProps) {
  const defaultFormat = (v: number) =>
    decimals !== undefined
      ? v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : v.toLocaleString();
  const format = formatFn || defaultFormat;
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Only animate once per mount, and respect reduced motion preference
    if (hasAnimated || prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    // Use Intersection Observer to only animate when visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            // Start animation after delay
            const timeout = setTimeout(() => {
              animateValue(0, value, duration);
              setHasAnimated(true);
            }, delay);
            return () => clearTimeout(timeout);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [value, duration, delay, hasAnimated, prefersReducedMotion]);

  // Update value if it changes after initial animation
  useEffect(() => {
    if (hasAnimated) {
      setDisplayValue(value);
    }
  }, [value, hasAnimated]);

  const animateValue = (start: number, end: number, animDuration: number) => {
    const startTime = performance.now();
    const diff = end - start;
    const multiplier = decimals !== undefined ? Math.pow(10, decimals) : 1;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animDuration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const rawValue = start + diff * eased;
      // Round to the correct number of decimal places
      const current = decimals !== undefined
        ? Math.round(rawValue * multiplier) / multiplier
        : Math.round(rawValue);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <span ref={elementRef} className={className}>
      {format(displayValue)}
    </span>
  );
}

// Convenience component for currency
interface AnimatedCurrencyProps {
  value: number;
  currency?: string;
  locale?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCurrency({
  value,
  currency = 'ZAR',
  locale = 'en-ZA',
  duration = 500,
  className = '',
}: AnimatedCurrencyProps) {
  return (
    <AnimatedNumber
      value={value}
      duration={duration}
      formatFn={(v) =>
        v.toLocaleString(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        })
      }
      className={className}
    />
  );
}
