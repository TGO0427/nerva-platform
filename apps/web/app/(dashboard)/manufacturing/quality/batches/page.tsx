'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/data-table';
import { ListPageTemplate } from '@/components/templates';
import { BatchQualityActionControl } from '@/components/ui/batch-quality-badge';
import { useBatchQualityQueue, BatchQualityQueueRow } from '@/lib/queries/manufacturing';
import { useQueryParams } from '@/lib/queries/use-query-params';
import { formatDateTime, formatQuantity } from '@/lib/format';
import type { BatchQualityStatus } from '@nerva/shared';

const STATUS_OPTIONS: { value: BatchQualityStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'AWAITING_QC', label: 'Awaiting QC' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RELEASED', label: 'Released' },
];

export default function BatchQualityQueuePage() {
  const [status, setStatus] = useState<BatchQualityStatus | ''>('AWAITING_QC');
  const [search, setSearchInput] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useBatchQualityQueue({
    ...params,
    status: status || undefined,
    search: search || undefined,
  });

  const tableData = data?.data ?? [];

  const columns: Column<BatchQualityQueueRow>[] = useMemo(() => [
    {
      key: 'itemSku',
      header: 'Item',
      render: (row) => (
        <div>
          <div className="font-medium text-primary-600">{row.itemSku}</div>
          <div className="text-xs text-slate-500">{row.itemDescription}</div>
        </div>
      ),
    },
    {
      key: 'batchNo',
      header: 'Batch No',
      render: (row) => <span className="font-mono text-sm">{row.batchNo}</span>,
    },
    {
      key: 'qualityStatus',
      header: 'QC Status',
      render: (row) => (
        <BatchQualityActionControl itemId={row.itemId} batchNo={row.batchNo} status={row.qualityStatus} />
      ),
    },
    {
      key: 'workOrderNo',
      header: 'Work Order',
      render: (row) => row.workOrderNo ? (
        <Link href={`/manufacturing/work-orders/${row.workOrderId}`} className="text-blue-600 hover:underline">
          {row.workOrderNo}
        </Link>
      ) : '-',
    },
    {
      key: 'qtyOnHand',
      header: 'Qty On Hand',
      className: 'text-right',
      render: (row) => formatQuantity(row.qtyOnHand),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => row.source === 'PRODUCTION' ? 'Production' : 'Receiving',
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (row) => formatDateTime(row.updatedAt),
    },
  ], []);

  return (
    <ListPageTemplate
      title="Batch QC Queue"
      subtitle="Every batch awaiting or moving through quality release, across all items and work orders"
      headerActions={
        <Link href="/manufacturing/quality">
          <Button variant="secondary">Non-Conformances</Button>
        </Link>
      }
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search SKU, description, batch no..."
            value={search}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value as BatchQualityStatus | ''); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        stickyHeader
        maxBodyHeight="65vh"
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        emptyState={{
          title: 'No batches found',
          description: 'No batches match the current filters.',
        }}
      />
    </ListPageTemplate>
  );
}
