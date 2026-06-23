'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Columns3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  type ComplianceDocument,
  type DocumentStatus,
  type ExpiryStatus,
  useDocumentStats,
  useDocuments,
} from '@/lib/queries';

const documentTypes = ['All', 'COA', 'Export', 'SGS', 'Invoice', 'POD', 'Quality', 'SADC'] as const;
const linkedEntities = ['All', 'supplier', 'customer', 'shipment', 'product', 'purchase_order', 'pod', 'invoice'] as const;
const statuses = ['All', 'APPROVED', 'PENDING', 'MISSING', 'REJECTED'] as const;
const expiryStatuses = ['All', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'NO_EXPIRY'] as const;

export default function DocumentCentrePage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<(typeof documentTypes)[number]>('All');
  const [linkedEntity, setLinkedEntity] = useState<(typeof linkedEntities)[number]>('All');
  const [status, setStatus] = useState<(typeof statuses)[number]>('All');
  const [expiryStatus, setExpiryStatus] = useState<(typeof expiryStatuses)[number]>('All');
  const [page, setPage] = useState(1);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['fileName', 'documentType', 'linkedLabel', 'status', 'expiryDate', 'uploadedByName', 'actions'])
  );

  const filters = {
    search,
    documentType: type === 'All' ? undefined : type,
    entityType: linkedEntity === 'All' ? undefined : linkedEntity,
    status: status === 'All' ? undefined : status,
    expiryStatus: expiryStatus === 'All' ? undefined : expiryStatus,
    page,
    limit: 25,
  };

  const {
    data: documentResult,
    error: documentsError,
    isError: isDocumentsError,
    isLoading,
  } = useDocuments(filters);
  const {
    data: stats,
    error: statsError,
    isError: isStatsError,
  } = useDocumentStats();
  const documents = documentResult?.data ?? [];
  const metricStats = stats ?? { approved: 0, pending: 0, missing: 0, needsAction: 0 };

  const allColumns: Column<ComplianceDocument>[] = [
    {
      key: 'fileName',
      header: 'Document',
      sortable: true,
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{doc.fileName}</p>
            <p className="text-xs text-slate-500">{doc.ownerName || 'Unassigned'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'documentType',
      header: 'Type',
      sortable: true,
      width: '120px',
      render: (doc) => <Badge variant="info">{formatLabel(doc.documentType)}</Badge>,
    },
    {
      key: 'linkedLabel',
      header: 'Linked To',
      sortable: true,
      render: (doc) => (
        <div>
          <p className="font-medium text-slate-800">{doc.linkedLabel || '-'}</p>
          <p className="text-xs text-slate-500">{formatLabel(doc.entityType)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '130px',
      render: (doc) => <Badge variant={getStatusVariant(doc.status)}>{formatLabel(doc.status)}</Badge>,
    },
    {
      key: 'expiryDate',
      header: 'Expiry',
      sortable: true,
      width: '150px',
      render: (doc) => (
        <div>
          <p className="text-sm text-slate-900">{formatDate(doc.expiryDate)}</p>
          <p className={cn('text-xs', getExpiryTextClass(doc.expiryStatus))}>{formatLabel(doc.expiryStatus)}</p>
        </div>
      ),
    },
    {
      key: 'uploadedByName',
      header: 'Uploaded By',
      sortable: true,
      width: '160px',
      render: (doc) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{doc.uploadedByName}</p>
          <p className="text-xs text-slate-500">{formatDate(doc.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      align: 'right',
      render: () => (
        <div className="flex items-center justify-end gap-1">
          <IconButton label="View document">
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  const columns = allColumns.filter((column) => visibleColumns.has(column.key));

  function toggleColumn(key: string) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        if (next.size > 2) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function exportCsv() {
    const rows = [
      ['Document', 'Type', 'Linked To', 'Linked Entity', 'Status', 'Expiry', 'Expiry Status', 'Uploaded By', 'Uploaded At'],
      ...documents.map((doc) => [
        doc.fileName,
        doc.documentType,
        doc.linkedLabel ?? '',
        doc.entityType,
        doc.status,
        doc.expiryDate ?? '',
        doc.expiryStatus,
        doc.uploadedByName,
        doc.createdAt,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nerva-document-centre.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Centre"
        subtitle="Track compliance documents, missing files, approvals, and expiry risk in one operational view."
        actions={(
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={documents.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="Approved" value={metricStats.approved} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <MetricCard title="Pending Review" value={metricStats.pending} icon={<ShieldCheck className="h-5 w-5" />} tone="info" />
        <MetricCard title="Needs Action" value={metricStats.needsAction} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <MetricCard title="Missing" value={metricStats.missing} icon={<FileCheck2 className="h-5 w-5" />} tone="danger" />
      </div>

      {(isDocumentsError || isStatsError) && (
        <Alert variant="error" title="Document Centre could not load">
          {getErrorMessage(documentsError || statsError)}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder="Search documents, linked records, owners..."
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect label="Type" value={type} options={documentTypes} onChange={(value) => { setType(value as typeof type); setPage(1); }} />
                  <FilterSelect label="Linked" value={linkedEntity} options={linkedEntities} onChange={(value) => { setLinkedEntity(value as typeof linkedEntity); setPage(1); }} formatOption={formatLabel} />
                  <FilterSelect label="Status" value={status} options={statuses} onChange={(value) => { setStatus(value as typeof status); setPage(1); }} formatOption={formatLabel} />
                  <FilterSelect label="Expiry" value={expiryStatus} options={expiryStatuses} onChange={(value) => { setExpiryStatus(value as typeof expiryStatus); setPage(1); }} formatOption={formatLabel} />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColumns((current) => !current)}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <Columns3 className="h-4 w-4" />
                    Columns
                  </button>
                  {showColumns && (
                    <div className="absolute right-0 z-20 mt-2 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                      {allColumns.map((column) => (
                        <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(column.key)}
                            onChange={() => toggleColumn(column.key)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          {column.header || 'Actions'}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <DataTable
            columns={columns}
            data={documents}
            keyField="id"
            density="compact"
            isLoading={isLoading}
            pagination={documentResult?.meta}
            onPageChange={setPage}
            emptyState={{
              icon: <FileText className="h-10 w-10" />,
              title: 'No documents match this view',
              description: 'Adjust the filters or upload a new compliance document.',
            }}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary-50 text-primary-700">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">Drop documents here</h2>
            <p className="mt-1 text-sm text-slate-500">Attach COAs, SADC forms, SGS certificates, PODs, and finance documents.</p>
            <Button className="mt-4 w-full" size="sm">
              Select Files
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4 text-slate-500" />
              Action Queue
            </div>
            <div className="mt-4 space-y-3">
              <QueueItem label="Expired documents" value={String(metricStats.needsAction)} tone="warning" />
              <QueueItem label="Missing files" value={String(metricStats.missing)} tone="danger" />
              <QueueItem label="Awaiting approval" value={String(metricStats.pending)} tone="info" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  formatOption = (option) => option,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  formatOption?: (value: string) => string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm font-medium text-slate-800 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: 'success' | 'info' | 'warning' | 'danger';
}) {
  const tones = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    info: 'bg-blue-50 text-blue-700 ring-blue-200',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200',
    danger: 'bg-red-50 text-red-700 ring-red-200',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-md ring-1 ring-inset', tones[tone])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QueueItem({ label, value, tone }: { label: string; value: string; tone: BadgeVariant }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function getStatusVariant(status: DocumentStatus): BadgeVariant {
  if (status === 'APPROVED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'MISSING' || status === 'REJECTED') return 'danger';
  return 'default';
}

function getExpiryTextClass(status: ExpiryStatus) {
  if (status === 'EXPIRED') return 'text-red-600';
  if (status === 'EXPIRING_SOON') return 'text-amber-600';
  if (status === 'VALID') return 'text-emerald-600';
  return 'text-slate-500';
}

function formatLabel(value?: string | null) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Check that the API deployment has the latest Document Centre migration and that your user has document access.';
}
