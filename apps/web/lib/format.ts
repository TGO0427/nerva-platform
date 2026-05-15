type FormatInput = string | number | Date | null | undefined;

const DEFAULT_LOCALE = 'en-ZA';

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: string | Date | null | undefined,
  fallback = '-',
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return fallback;
  const date = toDate(value);
  return date ? date.toLocaleDateString(DEFAULT_LOCALE, options) : fallback;
}

export function formatDateTime(
  value: string | Date | null | undefined,
  fallback = '-',
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return fallback;
  const date = toDate(value);
  return date ? date.toLocaleString(DEFAULT_LOCALE, options) : fallback;
}

export function formatTime(
  value: string | Date | null | undefined,
  fallback = '-',
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  if (!value) return fallback;
  const date = toDate(value);
  return date ? date.toLocaleTimeString(DEFAULT_LOCALE, options) : fallback;
}

export function formatNumber(value: FormatInput, options?: Intl.NumberFormatOptions, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(number);
}

export function formatQuantity(value: FormatInput, fallback = '-'): string {
  return formatNumber(value, { maximumFractionDigits: 3 }, fallback);
}

export function formatCurrency(value: FormatInput, currency = 'ZAR', fallback = '-'): string {
  return formatNumber(
    value,
    {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    fallback
  );
}

export function formatCompactCurrency(value: FormatInput, currency = 'ZAR', fallback = '-'): string {
  return formatNumber(
    value,
    {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    },
    fallback
  );
}

export function formatPercent(value: FormatInput, fractionDigits = 1, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return formatNumber(
    value,
    {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    },
    fallback
  ) + '%';
}
