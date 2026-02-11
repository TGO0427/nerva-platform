'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEntityHistory, AuditEntryWithActor } from '@/lib/queries/audit';
import { Spinner } from '@/components/ui/spinner';

interface EntityHistoryProps {
  entityType: string;
  entityId: string | undefined;
  title?: string;
  defaultOpen?: boolean;
}

// Action color mapping
const ACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  UPDATE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  APPROVE: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  DELETE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  STATUS_CHANGE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

// Get human-readable action label
function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    APPROVE: 'Approved',
    DELETE: 'Deleted',
    STATUS_CHANGE: 'Status changed',
  };
  return labels[action] || action;
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Get changed fields between before and after
function getChangedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): { field: string; from: unknown; to: unknown }[] {
  if (!before || !after) return [];

  const changes: { field: string; from: unknown; to: unknown }[] = [];
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  for (const key of allKeys) {
    // Skip internal fields
    if (['id', 'tenantId', 'tenant_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(key)) {
      continue;
    }

    const beforeVal = before[key];
    const afterVal = after[key];

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({ field: formatFieldName(key), from: beforeVal, to: afterVal });
    }
  }

  return changes;
}

// Convert camelCase/snake_case to Title Case
function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Format value for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function HistoryEntry({ entry, isLast }: { entry: AuditEntryWithActor; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const colors = ACTION_COLORS[entry.action] || ACTION_COLORS.UPDATE;
  const changes = getChangedFields(entry.beforeJson, entry.afterJson);
  const hasChanges = changes.length > 0;

  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[5px] top-6 bottom-0 w-px bg-slate-200" />
      )}

      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${colors.dot} ring-2 ring-white`} />

      {/* Content */}
      <div className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                {getActionLabel(entry.action)}
              </span>
              <span className="text-xs text-slate-500">
                {formatDate(entry.createdAt)}
              </span>
            </div>
            <p className="text-sm text-slate-700 mt-1">
              {entry.actorName || 'System'}
            </p>
          </div>

          {hasChanges && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0"
            >
              {expanded ? 'Hide' : 'Show'} details
              <svg
                className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Expandable changes */}
        <AnimatePresence>
          {expanded && hasChanges && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left font-medium pb-2">Field</th>
                      <th className="text-left font-medium pb-2">From</th>
                      <th className="text-left font-medium pb-2">To</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {changes.map((change, i) => (
                      <tr key={i} className="border-t border-slate-200">
                        <td className="py-1.5 pr-2 font-medium">{change.field}</td>
                        <td className="py-1.5 pr-2 text-slate-500 line-through">
                          {formatValue(change.from)}
                        </td>
                        <td className="py-1.5 text-slate-900">
                          {formatValue(change.to)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function EntityHistory({
  entityType,
  entityId,
  title = 'History',
  defaultOpen = true,
}: EntityHistoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { data: history, isLoading, error } = useEntityHistory(entityType, entityId);

  if (!entityId) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {history && history.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-100">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : error ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  Unable to load history
                </div>
              ) : !history || history.length === 0 ? (
                <div className="text-center py-6">
                  <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">No history yet</p>
                </div>
              ) : (
                <div className="pt-4">
                  {history.map((entry, index) => (
                    <HistoryEntry
                      key={entry.id}
                      entry={entry}
                      isLast={index === history.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
