'use client';

import { useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';

type DocumentStatus = 'Approved' | 'Pending' | 'Missing' | 'Rejected';
type ExpiryStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'No Expiry';
type DocumentType = 'COA' | 'Export' | 'SGS' | 'Invoice' | 'POD' | 'Quality' | 'SADC';
type LinkedEntity = 'Supplier' | 'Customer' | 'Shipment' | 'Product' | 'Purchase Order';

interface ComplianceDocument {
  id: string;
  document: string;
  type: DocumentType;
  linkedTo: string;
  linkedEntity: LinkedEntity;
  status: DocumentStatus;
  expiry: string | null;
  expiryStatus: ExpiryStatus;
  uploadedBy: string;
  uploadedAt: string;
  owner: string;
}

const documents: ComplianceDocument[] = [
  {
    id: 'doc-001',
    document: 'COA_Futura_PO-0012.pdf',
    type: 'COA',
    linkedTo: 'Futura PO-0012',
    linkedEntity: 'Purchase Order',
    status: 'Approved',
    expiry: '2027-06-23',
    expiryStatus: 'Valid',
    uploadedBy: 'Tino',
    uploadedAt: '2026-06-18',
    owner: 'Futura Foods',
  },
  {
    id: 'doc-002',
    document: 'SADC_export_zambia.pdf',
    type: 'SADC',
    linkedTo: 'Zambia Shipment',
    linkedEntity: 'Shipment',
    status: 'Pending',
    expiry: null,
    expiryStatus: 'No Expiry',
    uploadedBy: 'Liam',
    uploadedAt: '2026-06-21',
    owner: 'Border Desk',
  },
  {
    id: 'doc-003',
    document: 'SGS_COC_kenya_export.pdf',
    type: 'SGS',
    linkedTo: 'Kenya Export',
    linkedEntity: 'Shipment',
    status: 'Missing',
    expiry: null,
    expiryStatus: 'No Expiry',
    uploadedBy: 'QA',
    uploadedAt: '2026-06-20',
    owner: 'Quality',
  },
  {
    id: 'doc-004',
    document: 'POD_SH-1048_signed.pdf',
    type: 'POD',
    linkedTo: 'Shipment SH-1048',
    linkedEntity: 'Shipment',
    status: 'Approved',
    expiry: null,
    expiryStatus: 'No Expiry',
    uploadedBy: 'Driver App',
    uploadedAt: '2026-06-19',
    owner: 'Dispatch',
  },
  {
    id: 'doc-005',
    document: 'supplier_food_safety_cert.pdf',
    type: 'Quality',
    linkedTo: 'Cape Ingredients',
    linkedEntity: 'Supplier',
    status: 'Approved',
    expiry: '2026-07-08',
    expiryStatus: 'Expiring Soon',
    uploadedBy: 'Maya',
    uploadedAt: '2026-05-28',
    owner: 'Procurement',
  },
  {
    id: 'doc-006',
    document: 'customer_credit_terms.pdf',
    type: 'Invoice',
    linkedTo: 'Blue Retail Group',
    linkedEntity: 'Customer',
    status: 'Rejected',
    expiry: '2026-04-30',
    expiryStatus: 'Expired',
    uploadedBy: 'Finance',
    uploadedAt: '2026-04-12',
    owner: 'Finance',
  },
  {
    id: 'doc-007',
    document: 'product_spec_raw_sugar.pdf',
    type: 'COA',
    linkedTo: 'RAW-SUGAR-25KG',
    linkedEntity: 'Product',
    status: 'Approved',
    expiry: '2027-01-15',
    expiryStatus: 'Valid',
    uploadedBy: 'QA',
    uploadedAt: '2026-06-11',
    owner: 'Quality',
  },
];

const documentTypes = ['All', 'COA', 'Export', 'SGS', 'Invoice', 'POD', 'Quality', 'SADC'] as const;
const linkedEntities = ['All', 'Supplier', 'Customer', 'Shipment', 'Product', 'Purchase Order'] as const;
const statuses = ['All', 'Approved', 'Pending', 'Missing', 'Rejected'] as const;
const expiryStatuses = ['All', 'Valid', 'Expiring Soon', 'Expired', 'No Expiry'] as const;

export default function DocumentCentrePage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<(typeof documentTypes)[number]>('All');
  const [linkedEntity, setLinkedEntity] = useState<(typeof linkedEntities)[number]>('All');
  const [status, setStatus] = useState<(typeof statuses)[number]>('All');
  const [expiryStatus, setExpiryStatus] = useState<(typeof expiryStatuses)[number]>('All');
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['document', 'type', 'linkedTo', 'status', 'expiry', 'uploadedBy', 'actions'])
  );

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();

    return documents.filter((doc) => {
      const matchesSearch =
        !q ||
        doc.document.toLowerCase().includes(q) ||
        doc.linkedTo.toLowerCase().includes(q) ||
        doc.owner.toLowerCase().includes(q) ||
        doc.uploadedBy.toLowerCase().includes(q);

      return (
        matchesSearch &&
        (type === 'All' || doc.type === type) &&
        (linkedEntity === 'All' || doc.linkedEntity === linkedEntity) &&
        (status === 'All' || doc.status === status) &&
        (expiryStatus === 'All' || doc.expiryStatus === expiryStatus)
      );
    });
  }, [expiryStatus, linkedEntity, search, status, type]);

  const stats = useMemo(() => {
    const approved = documents.filter((doc) => doc.status === 'Approved').length;
    const pending = documents.filter((doc) => doc.status === 'Pending').length;
    const risk = documents.filter((doc) => doc.status === 'Missing' || doc.expiryStatus === 'Expired' || doc.expiryStatus === 'Expiring Soon').length;
    const missing = documents.filter((doc) => doc.status === 'Missing').length;

    return { approved, pending, risk, missing };
  }, []);

  const allColumns: Column<ComplianceDocument>[] = [
    {
      key: 'document',
      header: 'Document',
      sortable: true,
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{doc.document}</p>
            <p className="text-xs text-slate-500">{doc.owner}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      width: '110px',
      render: (doc) => <Badge variant="info">{doc.type}</Badge>,
    },
    {
      key: 'linkedTo',
      header: 'Linked To',
      sortable: true,
      render: (doc) => (
        <div>
          <p className="font-medium text-slate-800">{doc.linkedTo}</p>
          <p className="text-xs text-slate-500">{doc.linkedEntity}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '130px',
      render: (doc) => <Badge variant={getStatusVariant(doc.status)}>{doc.status}</Badge>,
    },
    {
      key: 'expiry',
      header: 'Expiry',
      sortable: true,
      width: '150px',
      render: (doc) => (
        <div>
          <p className="text-sm text-slate-900">{doc.expiry ?? '-'}</p>
          <p className={cn('text-xs', getExpiryTextClass(doc.expiryStatus))}>{doc.expiryStatus}</p>
        </div>
      ),
    },
    {
      key: 'uploadedBy',
      header: 'Uploaded By',
      sortable: true,
      width: '150px',
      render: (doc) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{doc.uploadedBy}</p>
          <p className="text-xs text-slate-500">{doc.uploadedAt}</p>
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

  function exportCsv() {
    const rows = [
      ['Document', 'Type', 'Linked To', 'Linked Entity', 'Status', 'Expiry', 'Expiry Status', 'Uploaded By', 'Uploaded At'],
      ...filteredDocuments.map((doc) => [
        doc.document,
        doc.type,
        doc.linkedTo,
        doc.linkedEntity,
        doc.status,
        doc.expiry ?? '',
        doc.expiryStatus,
        doc.uploadedBy,
        doc.uploadedAt,
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
            <Button variant="secondary" onClick={exportCsv}>
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
        <MetricCard title="Approved" value={stats.approved} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <MetricCard title="Pending Review" value={stats.pending} icon={<ShieldCheck className="h-5 w-5" />} tone="info" />
        <MetricCard title="Needs Action" value={stats.risk} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <MetricCard title="Missing" value={stats.missing} icon={<FileCheck2 className="h-5 w-5" />} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search documents, linked records, owners..."
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect label="Type" value={type} options={documentTypes} onChange={(value) => setType(value as typeof type)} />
                  <FilterSelect label="Linked" value={linkedEntity} options={linkedEntities} onChange={(value) => setLinkedEntity(value as typeof linkedEntity)} />
                  <FilterSelect label="Status" value={status} options={statuses} onChange={(value) => setStatus(value as typeof status)} />
                  <FilterSelect label="Expiry" value={expiryStatus} options={expiryStatuses} onChange={(value) => setExpiryStatus(value as typeof expiryStatus)} />
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
            data={filteredDocuments}
            keyField="id"
            density="compact"
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
              <QueueItem label="Expired customer documents" value="1" tone="danger" />
              <QueueItem label="Missing export certificates" value="1" tone="warning" />
              <QueueItem label="Awaiting approval" value="1" tone="info" />
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
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
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
            {option}
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
  if (status === 'Approved') return 'success';
  if (status === 'Pending') return 'warning';
  if (status === 'Missing' || status === 'Rejected') return 'danger';
  return 'default';
}

function getExpiryTextClass(status: ExpiryStatus) {
  if (status === 'Expired') return 'text-red-600';
  if (status === 'Expiring Soon') return 'text-amber-600';
  if (status === 'Valid') return 'text-emerald-600';
  return 'text-slate-500';
}
