'use client';

import { Fragment, useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExportActions } from '@/components/ui/export-actions';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuditLogs, type AuditEntryWithActor } from '@/lib/queries/audit';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'item', label: 'Item' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'cycle_count', label: 'Cycle Count' },
  { value: 'user', label: 'User' },
  { value: 'role', label: 'Role' },
];

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'POST', label: 'Post' },
];

const actionVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  APPROVE: 'warning',
  POST: 'default',
};

function formatEntityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function generateSummary(entry: AuditEntryWithActor): string {
  const entity = formatEntityType(entry.entityType);
  const before = entry.beforeJson;
  const after = entry.afterJson;

  if (entry.action === 'CREATE') {
    const name = after?.['name'] || after?.['email'] || after?.['sku'] || after?.['countNo'] || after?.['poNo'] || '';
    return `Created ${entity.toLowerCase()}${name ? ` "${name}"` : ''}`;
  }

  if (entry.action === 'DELETE') {
    const name = before?.['name'] || before?.['email'] || before?.['sku'] || '';
    return `Deleted ${entity.toLowerCase()}${name ? ` "${name}"` : ''}`;
  }

  if (entry.action === 'UPDATE' && before && after) {
    if (before['status'] !== after['status']) {
      return `Updated status from ${before['status']} to ${after['status']}`;
    }
    const changedKeys = Object.keys(after).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
    );
    if (changedKeys.length <= 3) {
      return `Updated ${changedKeys.join(', ')}`;
    }
    return `Updated ${changedKeys.length} fields`;
  }

  if (entry.action === 'APPROVE') {
    return `Approved ${entity.toLowerCase()}`;
  }

  if (entry.action === 'POST') {
    return `Posted ${entity.toLowerCase()}`;
  }

  return `${entry.action} on ${entity.toLowerCase()}`;
}

function JsonDiff({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) {
    return <p className="text-sm text-slate-500">No data recorded</p>;
  }

  const allKeys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  );

  const changes = allKeys
    .filter((key) => {
      const b = before?.[key];
      const a = after?.[key];
      return JSON.stringify(b) !== JSON.stringify(a);
    })
    .map((key) => ({
      key,
      before: before?.[key],
      after: after?.[key],
    }));

  if (changes.length === 0 && before && after) {
    return <p className="text-sm text-slate-500">No field changes detected</p>;
  }

  return (
    <div className="space-y-1">
      {before && !after && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-xs font-medium text-red-700 mb-1">Deleted record:</p>
          <pre className="text-xs text-red-800 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
      )}
      {!before && after && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-xs font-medium text-green-700 mb-1">Created record:</p>
          <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
      {before && after && changes.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 pr-4 font-medium text-slate-600">Field</th>
              <th className="text-left py-1 pr-4 font-medium text-slate-600">Before</th>
              <th className="text-left py-1 font-medium text-slate-600">After</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c) => (
              <tr key={c.key} className="border-b border-slate-100">
                <td className="py-1 pr-4 font-medium text-slate-700">{c.key}</td>
                <td className="py-1 pr-4 text-red-600">
                  {c.before !== undefined ? String(c.before) : '\u2014'}
                </td>
                <td className="py-1 text-green-600">
                  {c.after !== undefined ? String(c.after) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 25;

  const { data, isLoading } = useAuditLogs({
    page,
    limit,
    entityType: entityType || undefined,
    action: action || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const clearFilters = () => {
    setEntityType('');
    setAction('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasFilters = entityType || action || fromDate || toDate;
  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const entries = data?.data || [];

  const handleExport = () => {
    const exportColumns = [
      { key: 'createdAt', header: 'Timestamp', getValue: (row: AuditEntryWithActor) => formatDateForExport(row.createdAt) },
      { key: 'actorName', header: 'User', getValue: (row: AuditEntryWithActor) => row.actorName || 'System' },
      { key: 'action', header: 'Action' },
      { key: 'entityType', header: 'Entity Type', getValue: (row: AuditEntryWithActor) => formatEntityType(row.entityType) },
      { key: 'entityId', header: 'Entity ID', getValue: (row: AuditEntryWithActor) => row.entityId || '' },
      { key: 'summary', header: 'Summary', getValue: (row: AuditEntryWithActor) => generateSummary(row) },
    ];

    exportToCSV(entries, exportColumns, generateExportFilename('audit-log'));
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            View all system activity and changes across the platform
          </p>
        </div>
        <div className="flex justify-end gap-2 print:hidden">
          <ExportActions onExport={handleExport} />
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <Select
                label="Entity Type"
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
                options={ENTITY_TYPES}
              />
            </div>
            <div className="w-40">
              <Select
                label="Action"
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                options={ACTIONS}
              />
            </div>
            <div className="w-44">
              <Input
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-44">
              <Input
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No audit log entries</h3>
              <p className="mt-1 text-sm text-slate-500">
                {hasFilters
                  ? 'Try adjusting your filters.'
                  : 'Activity will appear here as changes are made.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-8 px-3 py-3" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {entries.map((entry) => (
                    <Fragment key={entry.id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-4 text-slate-400">
                          <svg
                            className={`h-4 w-4 transition-transform ${expandedId === entry.id ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {entry.actorName || <span className="text-slate-400">System</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={actionVariant[entry.action] || 'default'}>
                            {entry.action}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatEntityType(entry.entityType)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {generateSummary(entry)}
                        </td>
                      </tr>
                      {expandedId === entry.id && (
                        <tr key={`${entry.id}-detail`}>
                          <td colSpan={6} className="px-6 py-4 bg-slate-50">
                            <div className="flex items-center gap-6 mb-3 text-xs text-slate-500">
                              <span>Entry ID: {entry.id}</span>
                              {entry.entityId && <span>Entity ID: {entry.entityId}</span>}
                            </div>
                            <JsonDiff before={entry.beforeJson} after={entry.afterJson} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1}&ndash;{Math.min(page * limit, data.total)} of{' '}
            {data.total} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
