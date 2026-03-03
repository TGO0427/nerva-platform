'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Modal } from './modal';
import { Button } from './button';
import type { CsvImportConfig, CsvColumnMapping } from '@/lib/config/csv-import';

export interface ImportResult {
  imported: number;
  skipped: number;
  skippedCodes: string[];
}

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: CsvImportConfig;
  importFn: (rows: Record<string, unknown>[]) => Promise<ImportResult>;
}

type Step = 'upload' | 'preview' | 'importing' | 'results';

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function CsvImportDialog({ open, onClose, onSuccess, config, importFn }: CsvImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setErrors([]);
    setResult(null);
    setImportError(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const mapRow = useCallback((rawRow: Record<string, string>): { mapped: Record<string, unknown>; rowErrors: ValidationError[]; rowIndex: number } => {
    const mapped: Record<string, unknown> = {};
    const rowErrors: ValidationError[] = [];

    for (const col of config.columns) {
      const rawValue = rawRow[col.header]?.trim() ?? '';

      if (col.required && !rawValue) {
        rowErrors.push({ row: 0, field: col.header, message: `${col.header} is required` });
        continue;
      }

      if (!rawValue) {
        continue;
      }

      if (col.type === 'number') {
        const num = Number(rawValue);
        if (isNaN(num)) {
          rowErrors.push({ row: 0, field: col.header, message: `${col.header} must be a number` });
        } else {
          mapped[col.field] = num;
        }
      } else {
        mapped[col.field] = rawValue;
      }
    }

    return { mapped, rowErrors, rowIndex: 0 };
  }, [config.columns]);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportError('Please select a CSV file');
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setImportError('The CSV file is empty');
          return;
        }

        if (results.data.length > config.maxRows) {
          setImportError(`CSV contains ${results.data.length} rows, but the maximum is ${config.maxRows}`);
          return;
        }

        // Validate header columns
        const headers = results.meta.fields || [];
        const requiredHeaders = config.columns.filter(c => c.required).map(c => c.header);
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setImportError(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        const allErrors: ValidationError[] = [];
        const mappedRows: Record<string, unknown>[] = [];

        results.data.forEach((rawRow, index) => {
          const { mapped, rowErrors } = mapRow(rawRow);
          rowErrors.forEach(e => { e.row = index + 1; });
          allErrors.push(...rowErrors);
          mappedRows.push(mapped);
        });

        setParsedRows(mappedRows);
        setErrors(allErrors);
        setImportError(null);
        setStep('preview');
      },
      error: (err) => {
        setImportError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, [config, mapRow]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = useCallback(async () => {
    setStep('importing');
    setImportError(null);
    try {
      const res = await importFn(parsedRows);
      setResult(res);
      setStep('results');
      if (res.imported > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      // Try to extract validation message from API error
      const apiErr = err as { response?: { data?: { message?: string | string[] } } };
      const apiMessage = apiErr.response?.data?.message;
      if (Array.isArray(apiMessage)) {
        setImportError(apiMessage.join('\n'));
      } else if (typeof apiMessage === 'string') {
        setImportError(apiMessage);
      } else {
        setImportError(message);
      }
      setStep('preview');
    }
  }, [parsedRows, importFn, onSuccess]);

  const downloadTemplate = useCallback(() => {
    const headers = config.columns.map(c => c.header).join(',');
    const blob = new Blob([headers + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = config.templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const previewColumns = config.columns.filter(c =>
    c.required || parsedRows.some(r => r[c.field] !== undefined)
  );
  const previewRows = parsedRows.slice(0, 5);
  const validRows = parsedRows.filter((_, i) =>
    !errors.some(e => e.row === i + 1)
  );

  return (
    <Modal isOpen={open} onClose={handleClose} title={config.title} size="xl">
      {/* Upload Step */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <UploadIcon />
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop a CSV file here, or{' '}
              <button
                type="button"
                className="text-primary-600 hover:text-primary-700 font-medium"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-500">Maximum {config.maxRows} rows</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {importError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {importError}
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <DownloadIcon />
              Download Template
            </button>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{parsedRows.length}</span> rows found
              {errors.length > 0 && (
                <span className="text-amber-600 ml-2">
                  ({errors.length} validation {errors.length === 1 ? 'error' : 'errors'})
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Showing first {Math.min(5, parsedRows.length)} rows
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-10">#</th>
                  {previewColumns.map(col => (
                    <th key={col.field} className="px-3 py-2 text-left font-medium text-gray-500">
                      {col.header}
                      {col.required && <span className="text-red-500 ml-0.5">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((row, i) => {
                  const rowErrors = errors.filter(e => e.row === i + 1);
                  return (
                    <tr key={i} className={rowErrors.length > 0 ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      {previewColumns.map(col => {
                        const hasError = rowErrors.some(e => e.field === col.header);
                        return (
                          <td
                            key={col.field}
                            className={`px-3 py-2 ${hasError ? 'text-red-600 font-medium' : 'text-gray-900'}`}
                            title={hasError ? rowErrors.find(e => e.field === col.header)?.message : undefined}
                          >
                            {String(row[col.field] ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {errors.length > 0 && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 max-h-32 overflow-y-auto">
              <p className="font-medium mb-1">Validation errors:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.message}</li>
                ))}
                {errors.length > 10 && <li>...and {errors.length - 10} more</li>}
              </ul>
            </div>
          )}

          {importError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
              {importError}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={reset}>Back</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={errors.length > 0 || parsedRows.length === 0}
              >
                Import {errors.length > 0 ? validRows.length : parsedRows.length} Rows
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <div className="py-8 text-center space-y-4">
          <div className="flex justify-center">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Importing {parsedRows.length} rows...</p>
        </div>
      )}

      {/* Results Step */}
      {step === 'results' && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
            <div className="flex items-center gap-3 p-4">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {result.imported} {result.imported === 1 ? 'record' : 'records'} imported
                </p>
              </div>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-3 p-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <SkipIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {result.skipped} {result.skipped === 1 ? 'record' : 'records'} skipped (duplicate codes)
                  </p>
                  {result.skippedCodes.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {result.skippedCodes.slice(0, 10).join(', ')}
                      {result.skippedCodes.length > 10 && ` ...and ${result.skippedCodes.length - 10} more`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { reset(); }}>Import More</Button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function UploadIcon() {
  return (
    <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function SkipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
    </svg>
  );
}
