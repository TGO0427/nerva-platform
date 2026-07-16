'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/data-table';
import { ListPageTemplate } from '@/components/templates';
import { useQueryParams } from '@/lib/queries';
import { useUsers } from '@/lib/queries/settings';
import {
  useSupplierNcrWorklist,
  useAssignSupplierNcr,
  useUpdateSupplierNcrMeta,
} from '@/lib/queries/suppliers';
import { formatDate } from '@/lib/format';
import type { SupplierNcr } from '@nerva/shared';
import { NcrStatusActions } from '@/components/ncr-status-actions';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const NCR_TYPE_LABELS: Record<string, string> = {
  QUALITY: 'Quality',
  DELIVERY: 'Delivery',
  QUANTITY: 'Quantity',
  DOCUMENTATION: 'Documentation',
  OTHER: 'Other',
};

function getNcrStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'OPEN') return 'danger';
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success';
  return 'default';
}

function isOverdue(ncr: SupplierNcr): boolean {
  if (!ncr.dueDate) return false;
  if (ncr.status !== 'OPEN' && ncr.status !== 'IN_PROGRESS') return false;
  return new Date(ncr.dueDate) < new Date(new Date().toDateString());
}

export default function SupplierNcrsWorklistPage() {
  const [status, setStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useSupplierNcrWorklist({
    ...params,
    status: status ? [status] : undefined,
    assigneeId: assigneeId || undefined,
    overdue: overdueOnly || undefined,
    search: search || undefined,
  });
  const { data: usersData } = useUsers({ page: 1, limit: 100 });
  const assignNcr = useAssignSupplierNcr();
  const updateMeta = useUpdateSupplierNcrMeta();

  const userOptions = [
    { value: '', label: 'Unassigned' },
    ...(usersData?.data || []).map((u) => ({ value: u.id, label: u.displayName || u.email })),
  ];

  const columns: Column<SupplierNcr>[] = [
    {
      key: 'ncrNo',
      header: 'NCR No',
      render: (ncr) => (
        <Link href={`/master-data/suppliers/${ncr.supplierId}`} className="font-semibold text-primary-600 hover:underline">
          {ncr.ncrNo}
        </Link>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (ncr) => ncr.supplierName || ncr.supplierId.slice(0, 8),
    },
    {
      key: 'ncrType',
      header: 'Type',
      render: (ncr) => NCR_TYPE_LABELS[ncr.ncrType] || ncr.ncrType,
    },
    {
      key: 'description',
      header: 'Description',
      render: (ncr) => (
        <span className="max-w-[220px] truncate block" title={ncr.description}>
          {ncr.description}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (ncr) => <Badge variant={getNcrStatusVariant(ncr.status)}>{ncr.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'assigneeId',
      header: 'Assignee',
      render: (ncr) => (
        <Select
          value={ncr.assigneeId || ''}
          onChange={(e) => assignNcr.mutate({ ncrId: ncr.id, supplierId: ncr.supplierId, userId: e.target.value })}
          options={userOptions}
          className="min-w-[150px]"
          disabled={assignNcr.isPending}
        />
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (ncr) => (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={ncr.dueDate ? ncr.dueDate.slice(0, 10) : ''}
            onChange={(e) => updateMeta.mutate({ ncrId: ncr.id, supplierId: ncr.supplierId, data: { dueDate: e.target.value } })}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          {isOverdue(ncr) && <span className="text-xs font-semibold text-red-600">Overdue</span>}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (ncr) => formatDate(ncr.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (ncr) => <NcrStatusActions ncr={ncr} />,
    },
  ];

  const hasActiveFilters = Boolean(search || status || assigneeId || overdueOnly);

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setAssigneeId('');
    setOverdueOnly(false);
    setPage(1);
  };

  return (
    <ListPageTemplate
      title="Supplier NCRs"
      subtitle="Non-conformance reports across all suppliers"
      filters={
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search NCR number or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
          <Select
            value={assigneeId}
            onChange={(e) => { setAssigneeId(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All Assignees' }, ...userOptions.slice(1)]}
            className="max-w-xs"
          />
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }}
            />
            Overdue only
          </label>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={data?.data || []}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        emptyState={{
          title: 'No NCRs found',
          description: hasActiveFilters
            ? 'No NCRs match the current search or filters.'
            : 'No supplier non-conformance reports yet.',
        }}
      />
    </ListPageTemplate>
  );
}
