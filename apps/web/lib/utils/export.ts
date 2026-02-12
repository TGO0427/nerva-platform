import { api } from '@/lib/api';

/**
 * Download a PDF from an API endpoint
 */
export async function downloadPdf(url: string, filename: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(
    new Blob([response.data], { type: 'application/pdf' }),
  );
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * CSV Export Utilities
 */

export interface ExportColumn<T> {
  key: string;
  header: string;
  getValue?: (row: T) => string | number | null | undefined;
}

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger a file download in the browser
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` }); // BOM for Excel compatibility
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    // Export just headers if no data
    const headers = columns.map(c => escapeCSV(c.header)).join(',');
    downloadFile(headers, `${filename}.csv`, 'text/csv');
    return;
  }

  const headers = columns.map(c => escapeCSV(c.header)).join(',');

  const rows = data.map(row =>
    columns.map(col => {
      let value: string | number | null | undefined;

      if (col.getValue) {
        value = col.getValue(row);
      } else {
        value = (row as Record<string, unknown>)[col.key] as string | number | null | undefined;
      }

      if (value === null || value === undefined) {
        return '';
      }

      return escapeCSV(String(value));
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

/**
 * Generate a timestamped filename
 */
export function generateExportFilename(baseName: string): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${baseName}-${timestamp}`;
}

/**
 * Format a date for CSV export
 */
export function formatDateForExport(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-ZA'); // YYYY/MM/DD format
}

/**
 * Format a currency value for CSV export
 */
export function formatCurrencyForExport(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value.toFixed(2);
}
