'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { Select } from '@/components/ui/select';
import { SavedFilterViews, type SavedFilterValues } from '@/components/ui/saved-filter-views';
import {
  useExpiryAlertsSummary,
  useExpiringStock,
  useExpiredStock,
  ExpiringStock,
} from '@/lib/queries/inventory';
import { useWarehouses } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import { formatDate, formatNumber, formatQuantity } from '@/lib/format';

type FilterStatus = 'all' | 'EXPIRED' | 'CRITICAL' | 'WARNING';

const FILTER_STATUS_VALUES: FilterStatus[] = ['all', 'EXPIRED', 'CRITICAL', 'WARNING'];

export default function ExpiryAlertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [daysAhead, setDaysAhead] = useState<number>(30);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: summary, isLoading: summaryLoading } = useExpiryAlertsSummary();
  const { data: expiringStock, isLoading: expiringLoading } = useExpiringStock(
    daysAhead,
    warehouseId || undefined
  );
  const { data: expiredStock, isLoading: expiredLoading } = useExpiredStock(
    warehouseId || undefined
  );
  const { data: warehouses } = useWarehouses();

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && FILTER_STATUS_VALUES.includes(statusParam as FilterStatus)) {
      setFilterStatus(statusParam as FilterStatus);
    } else {
      setFilterStatus('all');
    }
  }, [searchParams]);

  // Combine and filter data based on status
  const allStock = [
    ...(expiredStock || []),
    ...(expiringStock?.filter((s) => s.expiryStatus !== 'EXPIRED') || []),
  ];

  const statusFiltered =
    filterStatus === 'all'
      ? allStock
      : allStock.filter((s) => s.expiryStatus === filterStatus);

  const filteredStock = useMemo(() => {
    if (!search) return statusFiltered;
    const q = search.toLowerCase();
    return statusFiltered.filter(
      (s) =>
        s.itemSku.toLowerCase().includes(q) ||
        s.itemDescription.toLowerCase().includes(q) ||
        s.batchNo?.toLowerCase().includes(q) ||
        s.binCode?.toLowerCase().includes(q),
    );
  }, [statusFiltered, search]);

  const allColumns: Column<ExpiringStock>[] = useMemo(() => [
    {
      key: 'itemSku',
      header: 'SKU',
      sortable: true,
      render: (row) => (
        <Link
          href={`/inventory/stock/${row.itemId}`}
          className="font-medium text-primary-600 hover:underline"
        >
          {row.itemSku}
        </Link>
      ),
    },
    {
      key: 'itemDescription',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'batchNo',
      header: 'Batch No',
      sortable: true,
    },
    {
      key: 'binCode',
      header: 'Bin',
      sortable: true,
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      sortable: true,
      render: (row) => formatDate(row.expiryDate),
    },
    {
      key: 'daysUntilExpiry',
      header: 'Days Until Expiry',
      sortable: true,
      render: (row) => (
        <span
          className={
            row.daysUntilExpiry <= 0
              ? 'text-red-600 font-semibold'
              : row.daysUntilExpiry <= 7
                ? 'text-orange-600 font-semibold'
                : row.daysUntilExpiry <= 30
                  ? 'text-yellow-600'
                  : 'text-slate-600'
          }
        >
          {row.daysUntilExpiry <= 0
            ? `${formatNumber(Math.abs(row.daysUntilExpiry))} days ago`
            : `${formatNumber(row.daysUntilExpiry)} days`}
        </span>
      ),
    },
    {
      key: 'qtyOnHand',
      header: 'Qty On Hand',
      sortable: true,
      render: (row) => formatQuantity(row.qtyOnHand),
    },
    {
      key: 'expiryStatus',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const variants: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
          EXPIRED: 'danger',
          CRITICAL: 'warning',
          WARNING: 'info',
          OK: 'success',
        };
        return (
          <Badge variant={variants[row.expiryStatus] || 'info'}>
            {row.expiryStatus}
          </Badge>
        );
      },
    },
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'expiry-alerts', alwaysVisible: ['itemSku'] });

  const isLoading = summaryLoading || expiringLoading || expiredLoading;
  const activeFilterLabels = [
    filterStatus !== 'all' ? `Status: ${filterStatus}` : null,
    warehouseId ? `Warehouse: ${warehouses?.find((warehouse) => warehouse.id === warehouseId)?.name ?? warehouseId}` : null,
    daysAhead !== 30 ? `Window: ${daysAhead} days` : null,
    search ? `Search: ${search}` : null,
  ].filter(Boolean) as string[];

  const clearAllFilters = () => {
    setFilterStatus('all');
    setWarehouseId('');
    setDaysAhead(30);
    setSearch('');
    router.replace('/inventory/expiry-alerts');
  };

  const applySavedView = (values: SavedFilterValues) => {
    const nextStatus = typeof values.filterStatus === 'string' && FILTER_STATUS_VALUES.includes(values.filterStatus as FilterStatus)
      ? values.filterStatus as FilterStatus
      : 'all';
    const nextDaysAhead = Number(values.daysAhead);

    setFilterStatus(nextStatus);
    setWarehouseId(typeof values.warehouseId === 'string' ? values.warehouseId : '');
    setDaysAhead(Number.isFinite(nextDaysAhead) && nextDaysAhead > 0 ? nextDaysAhead : 30);
    setSearch(typeof values.search === 'string' ? values.search : '');
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expiry Alerts</h1>
          <p className="text-slate-500 mt-1">
            Monitor batch expiry dates and take action on expiring stock
          </p>
        </div>
        <div className="flex gap-2">
          <ExportActions onExport={() => {
            const exportColumns = [
              { key: 'itemSku', header: 'SKU' },
              { key: 'itemDescription', header: 'Description' },
              { key: 'batchNo', header: 'Batch No' },
              { key: 'binCode', header: 'Bin' },
              { key: 'expiryDate', header: 'Expiry Date', getValue: (r: ExpiringStock) => formatDateForExport(r.expiryDate) },
              { key: 'daysUntilExpiry', header: 'Days Until Expiry' },
              { key: 'qtyOnHand', header: 'Qty On Hand' },
              { key: 'expiryStatus', header: 'Status' },
            ];
            exportToCSV(filteredStock, exportColumns, generateExportFilename('expiry-alerts'));
          }} />
          <Link href="/inventory">
            <Button variant="secondary">
              <BackIcon />
              Back to Inventory
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Expired"
          value={formatNumber(summary?.expired || 0)}
          icon={<ExpiredIcon />}
          iconColor="red"
          alert={(summary?.expired || 0) > 0}
          href="/inventory/expiry-alerts?status=EXPIRED"
        />
        <StatCard
          title="Critical (7 days)"
          value={formatNumber(summary?.critical || 0)}
          icon={<CriticalIcon />}
          iconColor="orange"
          alert={(summary?.critical || 0) > 0}
          href="/inventory/expiry-alerts?status=CRITICAL"
        />
        <StatCard
          title="Warning (30 days)"
          value={formatNumber(summary?.warning || 0)}
          icon={<WarningIcon />}
          iconColor="yellow"
          href="/inventory/expiry-alerts?status=WARNING"
        />
      </div>

      {activeFilterLabels.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
          <span className="font-medium">Active filters:</span>
          {activeFilterLabels.map((label) => (
            <span key={label} className="rounded bg-white px-2 py-0.5 text-xs font-medium text-primary-700 shadow-sm">
              {label}
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto text-xs font-medium text-primary-700 hover:text-primary-900"
          >
            Clear
          </button>
        </div>
      )}

      {/* Stock table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>
              {filterStatus === 'all' ? 'All Expiring Stock' : `${filterStatus} Stock`}
            </CardTitle>
            <div className="flex gap-2">
              <SavedFilterViews
                storageKey="expiry-alerts"
                currentValues={{ filterStatus, daysAhead, warehouseId, search }}
                onApply={applySavedView}
              />
              <Input
                placeholder="Search SKU, batch, bin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
              />
              <Select
                value={daysAhead.toString()}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                options={[
                  { label: 'Next 7 days', value: '7' },
                  { label: 'Next 14 days', value: '14' },
                  { label: 'Next 30 days', value: '30' },
                  { label: 'Next 60 days', value: '60' },
                  { label: 'Next 90 days', value: '90' },
                ]}
                className="w-40"
              />
              <Select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                options={[
                  { label: 'All Warehouses', value: '' },
                  ...(warehouses?.map((w) => ({ label: w.name, value: w.id })) || []),
                ]}
                className="w-48"
              />
              <ColumnToggle
                columns={allColumns}
                visibleKeys={visibleKeys}
                onToggle={toggleColumn}
                onReset={resetColumns}
                alwaysVisible={['itemSku']}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={visibleColumns}
            data={filteredStock}
            keyField="binId"
            isLoading={isLoading}
            emptyState={{
              icon: <CheckIcon />,
              title: 'No expiring stock',
              description:
                filterStatus === 'all'
                  ? 'No stock is expiring within the selected timeframe'
                  : `No stock with ${filterStatus} status`,
              action: activeFilterLabels.length > 0 ? (
                <Button variant="secondary" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              ) : undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function ExpiredIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CriticalIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
