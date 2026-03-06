'use client';

import { useState, useEffect } from 'react';

interface ChartTheme {
  grid: string;
  axis: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipShadow: string;
  dotFill: string;
  activeDotStroke: string;
}

const lightTheme: ChartTheme = {
  grid: '#e2e8f0',
  axis: '#cbd5e1',
  tick: '#94a3b8',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipText: '#334155',
  tooltipShadow: '0 4px 12px rgba(0,0,0,0.08)',
  dotFill: '#ffffff',
  activeDotStroke: '#ffffff',
};

const darkTheme: ChartTheme = {
  grid: '#334155',
  axis: '#475569',
  tick: '#94a3b8',
  tooltipBg: '#1e293b',
  tooltipBorder: '#475569',
  tooltipText: '#e2e8f0',
  tooltipShadow: '0 4px 12px rgba(0,0,0,0.3)',
  dotFill: '#1e293b',
  activeDotStroke: '#1e293b',
};

export function useChartTheme(): ChartTheme {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains('dark'));
    });

    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark ? darkTheme : lightTheme;
}

/** Shorthand for common recharts Tooltip contentStyle */
export function tooltipStyle(theme: ChartTheme) {
  return {
    backgroundColor: theme.tooltipBg,
    borderRadius: '0.75rem',
    border: `1px solid ${theme.tooltipBorder}`,
    color: theme.tooltipText,
    fontSize: 13,
    boxShadow: theme.tooltipShadow,
  };
}
