'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/data-table';
import { ListPageTemplate } from '@/components/templates';
import { useToast } from '@/components/ui/toast';
import { useTableSelection } from '@/lib/hooks';
import {
  useImportShipments,
  useQueryParams,
  useUpdateImportShipmentLine,
  useUpdateImportShipment,
  type UpdateImportShipmentLineData,
} from '@/lib/queries';
import {
  ALL_IMPORT_SHIPMENT_STATUSES,
  STATUS_LABELS,
  DELAYED_STATUSES,
  getVesselTrackingUrl,
  getForwardingAgents,
} from '@nerva/shared';
import type { ImportShipmentLineRow, ImportShipmentStatus } from '@nerva/shared';
import { ProgressDots } from './progress-dots';
import { WeekBadge } from './week-badge';
import { INCOTERM_OPTIONS, getStatusSelectClass } from './schedule-constants';
import { useSiblingPropagation } from './use-sibling-propagation';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...ALL_IMPORT_SHIPMENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

interface RowEdits {
  palletQty?: number;
  vesselOrAwb?: string;
  carrier?: string;
  incoterm?: string;
}

export default function ImportSchedulePage() {
  const [status, setStatus] = useState<ImportShipmentStatus | ''>('');
  const [search, setSearch] = useState('');
  const { params, setPage } = useQueryParams();
  const { addToast } = useToast();
  const { propagate } = useSiblingPropagation();
  const updateLine = useUpdateImportShipmentLine();
  const updateShipment = useUpdateImportShipment();
  const [edits, setEdits] = useState<Record<string, RowEdits>>({});

  const { data, isLoading } = useImportShipments({
    ...params,
    status: status || undefined,
    search: search || undefined,
  });

  const rows = data?.data || [];
  const selection = useTableSelection(rows);

  const setRowEdit = (rowId: string, patch: Partial<RowEdits>) => {
    setEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], ...patch } }));
  };

  const clearRowEdit = (rowId: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const handleStatusChange = async (row: ImportShipmentLineRow, newStatus: ImportShipmentStatus) => {
    try {
      await updateLine.mutateAsync({
        shipmentId: row.importShipmentId,
        lineId: row.id,
        data: { status: newStatus },
      });
      addToast(`Status updated to ${STATUS_LABELS[newStatus]}`, 'success');
      await propagate(row.importShipmentId, row.id, row.reference, { status: newStatus }, 'Status', {
        excludeShippingExcluded: true,
      });
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const handleWeekChange = async (row: ImportShipmentLineRow, weekStartDate: string, weekEndDate: string) => {
    try {
      await updateLine.mutateAsync({
        shipmentId: row.importShipmentId,
        lineId: row.id,
        data: { weekStartDate, weekEndDate },
      });
      addToast('Week updated', 'success');
      await propagate(row.importShipmentId, row.id, row.reference, { weekStartDate, weekEndDate }, 'Week');
    } catch {
      addToast('Failed to update week', 'error');
    }
  };

  const handleSaveRow = async (row: ImportShipmentLineRow) => {
    const rowEdits = edits[row.id];
    if (!rowEdits) return;
    const { incoterm, ...lineFields } = rowEdits;

    try {
      if (Object.keys(lineFields).length > 0) {
        await updateLine.mutateAsync({
          shipmentId: row.importShipmentId,
          lineId: row.id,
          data: lineFields as UpdateImportShipmentLineData,
        });
      }
      if (incoterm !== undefined) {
        await updateShipment.mutateAsync({ id: row.importShipmentId, data: { incoterm } });
      }
      addToast('Changes saved', 'success');
      clearRowEdit(row.id);

      const propagateFields: UpdateImportShipmentLineData = {};
      if (lineFields.vesselOrAwb !== undefined) propagateFields.vesselOrAwb = lineFields.vesselOrAwb;
      if (lineFields.carrier !== undefined) propagateFields.carrier = lineFields.carrier;
      if (Object.keys(propagateFields).length > 0) {
        const label = lineFields.vesselOrAwb !== undefined && lineFields.carrier !== undefined
          ? 'Vessel/AWB and Agent'
          : lineFields.vesselOrAwb !== undefined ? 'Vessel/AWB' : 'Agent';
        await propagate(row.importShipmentId, row.id, row.reference, propagateFields, label);
      }
    } catch {
      addToast('Failed to save changes', 'error');
    }
  };

  const columns: Column<ImportShipmentLineRow>[] = [
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (row) => (
        <span className="font-semibold text-slate-900">{row.supplierName || row.supplierId.slice(0, 8)}</span>
      ),
    },
    {
      key: 'reference',
      header: 'Order / Ref',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Link href={`/import-schedule/${row.importShipmentId}`} className="font-semibold text-primary-600 hover:underline">
            {row.reference}
          </Link>
          {DELAYED_STATUSES.includes(row.status) && (
            <span title="Delayed" className="text-red-500">⚠️</span>
          )}
        </div>
      ),
    },
    {
      key: 'productDescription',
      header: 'Product',
      render: (row) => (
        <span className="max-w-[220px] truncate block" title={row.productDescription}>
          {row.productDescription}
        </span>
      ),
    },
    {
      key: 'destinationPort',
      header: 'Final POD',
      render: (row) => row.destinationPort || '—',
    },
    {
      key: 'status',
      header: 'Status',
      width: '150px',
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleStatusChange(row, e.target.value as ImportShipmentStatus)}
          disabled={updateLine.isPending}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase border-0 ${getStatusSelectClass(row.status)}`}
        >
          {ALL_IMPORT_SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (row) => (
        <ProgressDots
          status={row.status}
          isDelayed={DELAYED_STATUSES.includes(row.status)}
          isCancelled={row.status === 'CANCELLED'}
        />
      ),
    },
    {
      key: 'weekStartDate',
      header: 'Week',
      render: (row) => (
        <WeekBadge
          weekStartDate={row.weekStartDate}
          weekEndDate={row.weekEndDate}
          onChange={(start, end) => handleWeekChange(row, start, end)}
          disabled={updateLine.isPending}
        />
      ),
    },
    {
      key: 'palletQty',
      header: 'Pallets',
      render: (row) => {
        const dirty = edits[row.id]?.palletQty !== undefined;
        const value = edits[row.id]?.palletQty ?? row.palletQty ?? '';
        return (
          <Input
            type="number"
            min="0"
            value={value}
            onChange={(e) => setRowEdit(row.id, { palletQty: e.target.value ? Number(e.target.value) : undefined })}
            className={`w-20 ${dirty ? 'border-amber-400 bg-amber-50' : ''}`}
          />
        );
      },
    },
    {
      key: 'vesselOrAwb',
      header: 'Vessel / AWB',
      render: (row) => {
        const dirty = edits[row.id]?.vesselOrAwb !== undefined;
        const value = edits[row.id]?.vesselOrAwb ?? row.vesselOrAwb ?? '';
        const trackingUrl = value ? getVesselTrackingUrl(row.transportMode, value) : null;
        return (
          <div className="flex items-center gap-1">
            <Input
              value={value}
              onChange={(e) => setRowEdit(row.id, { vesselOrAwb: e.target.value })}
              placeholder={row.transportMode === 'AIR' ? 'AWB Number' : 'Vessel Name'}
              className={`min-w-[130px] ${dirty ? 'border-amber-400 bg-amber-50' : ''}`}
            />
            {trackingUrl && (
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary-600 hover:text-primary-700">
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'incoterm',
      header: 'Incoterm',
      render: (row) => {
        const dirty = edits[row.id]?.incoterm !== undefined;
        const value = edits[row.id]?.incoterm ?? row.incoterm ?? '';
        return (
          <Select
            value={value}
            onChange={(e) => setRowEdit(row.id, { incoterm: e.target.value })}
            options={INCOTERM_OPTIONS}
            className={`min-w-[90px] ${dirty ? 'border-amber-400 bg-amber-50' : ''}`}
          />
        );
      },
    },
    {
      key: 'carrier',
      header: 'Agent',
      render: (row) => {
        const dirty = edits[row.id]?.carrier !== undefined;
        const value = edits[row.id]?.carrier ?? row.carrier ?? '';
        const agentOptions = [
          { value: '', label: 'Select Agent' },
          ...getForwardingAgents(row.transportMode).map((a) => ({ value: a.value, label: a.label })),
        ];
        return (
          <Select
            value={value}
            onChange={(e) => setRowEdit(row.id, { carrier: e.target.value })}
            options={agentOptions}
            className={`min-w-[130px] ${dirty ? 'border-amber-400 bg-amber-50' : ''}`}
          />
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {edits[row.id] && (
            <Button size="sm" onClick={() => handleSaveRow(row)} isLoading={updateLine.isPending || updateShipment.isPending}>
              Save
            </Button>
          )}
          <Link href={`/import-schedule/${row.importShipmentId}/edit`}>
            <Button size="sm" variant="secondary">Amend</Button>
          </Link>
        </div>
      ),
    },
  ];

  const hasActiveFilters = Boolean(search || status);

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  return (
    <ListPageTemplate
      title="Import Schedule"
      subtitle="Track inbound shipments from suppliers"
      headerActions={
        <Link href="/import-schedule/new">
          <Button>
            <PlusIcon />
            New Shipment
          </Button>
        </Link>
      }
      filters={
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search reference, supplier or product..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value as ImportShipmentStatus | ''); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        selectable
        selectedIds={selection.selectedIds}
        onSelectionChange={selection.toggle}
        onSelectAll={() => selection.togglePage(rows)}
        isAllSelected={selection.isAllSelected}
        isSomeSelected={selection.isSomeSelected}
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        emptyState={{
          icon: <ShipmentIcon />,
          title: 'No shipments found',
          description: hasActiveFilters
            ? 'No shipments match the current search or filters.'
            : 'Create your first import shipment to get started.',
          action: hasActiveFilters ? (
            <Button variant="secondary" onClick={clearAllFilters}>Clear Filters</Button>
          ) : (
            <Link href="/import-schedule/new">
              <Button>Create Shipment</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}

function ShipmentIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
