'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExportActions } from '@/components/ui/export-actions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useQueryParams, useWarehouses } from '@/lib/queries';
import { useStockSnapshots, useExpiryAlertsSummary, StockSnapshot } from '@/lib/queries/inventory';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';

// Extended type with id for table selection
interface StockRow extends StockSnapshot {
  id: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const { params, setPage, setSearch } = useQueryParams();
  const { data: stockData, isLoading } = useStockSnapshots(params);
  const { data: warehouses } = useWarehouses();
  const { data: expiryAlerts } = useExpiryAlertsSummary();

  // Add unique id for each row (composite key: itemId + binId + batchNo)
  const tableData: StockRow[] = useMemo(() => {
    return (stockData?.data || []).map(row => ({
      ...row,
      id: `${row.itemId}-${row.binId}-${row.batchNo || 'no-batch'}`,
    }));
  }, [stockData?.data]);

  // Row selection
  const {
    selectedIds,
    selectedCount,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggle,
    togglePage,
    clearSelection,
  } = useTableSelection(tableData);

  // Column definitions
  const allColumns: Column<StockRow>[] = useMemo(() => [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => (
        <span className="font-medium text-primary-600">{row.itemSku}</span>
      ),
    },
    {
      key: 'itemDescription',
      header: 'Description',
    },
    {
      key: 'batchNo',
      header: 'Batch No.',
      render: (row) => row.batchNo || <span className="text-slate-400">-</span>,
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (row) => {
        if (!row.expiryDate) return <span className="text-slate-400">-</span>;
        const date = new Date(row.expiryDate);
        const now = new Date();
        const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isExpired = daysUntil < 0;
        const isCritical = daysUntil >= 0 && daysUntil <= 7;
        return (
          <span className={isExpired ? 'text-red-600 font-medium' : isCritical ? 'text-orange-600' : ''}>
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
    },
    {
      key: 'binCode',
      header: 'Bin',
    },
    {
      key: 'qtyOnHand',
      header: 'On Hand',
      width: '100px',
      render: (row) => (
        <span className="font-medium">{row.qtyOnHand}</span>
      ),
    },
    {
      key: 'qtyReserved',
      header: 'Reserved',
      width: '100px',
      render: (row) => (
        <span className={row.qtyReserved > 0 ? 'text-orange-600' : 'text-slate-400'}>
          {row.qtyReserved}
        </span>
      ),
    },
    {
      key: 'qtyAvailable',
      header: 'Available',
      width: '100px',
      render: (row) => (
        <span className={row.qtyAvailable > 0 ? 'text-green-600 font-medium' : 'text-slate-400'}>
          {row.qtyAvailable}
        </span>
      ),
    },
  ], []);

  // Column visibility
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'inventory-stock', alwaysVisible: ['itemSku'] });

  const handleRowClick = (row: StockRow) => {
    router.push(`/inventory/stock/${row.itemId}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'itemSku', header: 'SKU' },
      { key: 'itemDescription', header: 'Description' },
      { key: 'batchNo', header: 'Batch No.', getValue: (row: StockRow) => row.batchNo || '' },
      { key: 'expiryDate', header: 'Expiry Date', getValue: (row: StockRow) => row.expiryDate ? formatDateForExport(row.expiryDate) : '' },
      { key: 'warehouseName', header: 'Warehouse' },
      { key: 'binCode', header: 'Bin' },
      { key: 'qtyOnHand', header: 'On Hand' },
      { key: 'qtyReserved', header: 'Reserved' },
      { key: 'qtyAvailable', header: 'Available' },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('inventory'));
  };

  const expiredCount = expiryAlerts?.expired || 0;
  const criticalCount = expiryAlerts?.critical || 0;
  const totalStockRows = stockData?.meta?.total || 0;

  return (
    <ListPageTemplate
      title="Inventory"
      subtitle="View and manage stock levels"
      headerActions={
        <div className="flex gap-2">
          <Link href="/inventory/expiry-alerts">
            <Button variant="secondary">
              <ExpiryIcon />
              Expiry Alerts
              {expiredCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {expiredCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/inventory/grn">
            <Button variant="secondary">
              <ReceiveIcon />
              GRN Receiving
            </Button>
          </Link>
          <Link href="/inventory/transfers">
            <Button variant="secondary">
              <TransferIcon />
              Transfers
            </Button>
          </Link>
        </div>
      }
      stats={[
        {
          title: 'Warehouses',
          value: warehouses?.length || 0,
          icon: <WarehouseIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Stock Records',
          value: totalStockRows,
          icon: <ItemsIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Expiry Alerts',
          value: expiredCount,
          subtitle: criticalCount > 0 ? `+${criticalCount} critical` : undefined,
          subtitleType: 'negative',
          icon: <ExpiryLgIcon />,
          iconColor: expiredCount > 0 ? 'red' : 'gray',
          href: '/inventory/expiry-alerts',
          alert: expiredCount > 0,
        },
        {
          title: 'Pending GRNs',
          value: '-',
          icon: <GrnIcon />,
          iconColor: 'blue',
          emptyHint: 'No pending receipts',
        },
      ]}
      statsColumns={4}
      filters={
        <Input
          type="search"
          placeholder="Search by SKU, description, batch number..."
          className="max-w-md"
          value={params.search || ''}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
      filterActions={
        <div className="flex gap-2 print:hidden">
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['itemSku']}
          />
          <ExportActions onExport={handleExport} selectedCount={selectedCount} />
        </div>
      }
    >
      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
        >
          <ExportActions onExport={handleExport} />
        </BulkActionBar>
      )}

      <DataTable
        columns={visibleColumns}
        data={tableData}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={toggle}
        onSelectAll={() => togglePage(tableData)}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        pagination={stockData?.meta ? {
          page: stockData.meta.page,
          limit: stockData.meta.limit,
          total: stockData.meta.total || 0,
          totalPages: stockData.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <BoxIcon />,
          title: 'No stock found',
          description: params.search
            ? 'No stock records match your search criteria'
            : 'No stock has been received yet',
        }}
      />
    </ListPageTemplate>
  );
}

// Button icons (small)
function ExpiryIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ReceiveIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

// Stat card icons (medium)
function WarehouseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ItemsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ExpiryLgIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GrnIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

// Empty state icon (large)
function BoxIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
