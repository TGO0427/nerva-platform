'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, Column } from '@/components/ui/data-table';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMrpRequirements, useCreatePoFromShortage, useCreateWoFromShortage } from '@/lib/queries';
import { formatNumber, formatQuantity, formatDate } from '@/lib/format';
import type { MrpData } from '@nerva/shared';

type MrpItemRow = MrpData['itemSummary'][number] & { rowId: string };
type MrpWorkOrderRow = MrpData['workOrderDemand'][number] & { rowId: string };
type MrpSalesOrderRow = MrpData['salesOrderDemand'][number] & { rowId: string };

type TabView = 'by-item' | 'by-work-order' | 'by-sales-order';

function ResupplyHint({ item }: {
  item: {
    itemId: string;
    nearestPoNo?: string | null;
    nearestPoExpectedDate?: string | null;
    supplierLeadTimeDays?: number | null;
  };
}) {
  if (item.nearestPoNo) {
    return (
      <span className="text-xs">
        PO <span className="font-medium text-slate-700">{item.nearestPoNo}</span>
        {item.nearestPoExpectedDate && <> &middot; due {formatDate(item.nearestPoExpectedDate)}</>}
      </span>
    );
  }
  if (item.supplierLeadTimeDays != null) {
    return <span className="text-xs">No open PO &middot; ~{item.supplierLeadTimeDays}d lead time</span>;
  }
  return <span className="text-xs text-slate-400">No open PO or supplier lead time on file</span>;
}

export default function MrpPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TabView>('by-item');
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useMrpRequirements();
  const createPo = useCreatePoFromShortage();
  const createWo = useCreateWoFromShortage();

  const itemSummaryAll: MrpItemRow[] = useMemo(
    () => (data?.itemSummary ?? []).map((row) => ({ ...row, rowId: `${row.itemId}-${row.warehouseId}` })),
    [data?.itemSummary]
  );
  const workOrderDemandAll: MrpWorkOrderRow[] = useMemo(
    () => (data?.workOrderDemand ?? []).map((row, idx) => ({ ...row, rowId: `${row.workOrderId}-${row.itemId}-${idx}` })),
    [data?.workOrderDemand]
  );
  const salesOrderDemandAll: MrpSalesOrderRow[] = useMemo(
    () => (data?.salesOrderDemand ?? []).map((row, idx) => ({ ...row, rowId: `${row.salesOrderId}-${row.itemId}-${idx}` })),
    [data?.salesOrderDemand]
  );

  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = (fields: Array<string | null | undefined>) =>
    searchTerm === '' || fields.some((f) => (f ?? '').toLowerCase().includes(searchTerm));

  const itemSummary = useMemo(
    () => itemSummaryAll.filter((row) => matchesSearch([row.itemSku, row.itemDescription, row.warehouseName])),
    [itemSummaryAll, searchTerm]
  );
  const workOrderDemand = useMemo(
    () => workOrderDemandAll.filter((row) => matchesSearch([row.workOrderNo, row.itemSku, row.itemDescription, row.warehouseName])),
    [workOrderDemandAll, searchTerm]
  );
  const salesOrderDemand = useMemo(
    () => salesOrderDemandAll.filter((row) => matchesSearch([row.orderNo, row.customerName, row.itemSku, row.itemDescription, row.warehouseName])),
    [salesOrderDemandAll, searchTerm]
  );

  const handleCreatePo = async (row: { itemId: string; itemSku: string; warehouseId: string; qty: number }) => {
    const confirmed = await confirm({
      title: 'Create Purchase Order',
      message: `Create a draft PO for ${formatQuantity(row.qty)} of ${row.itemSku}? The preferred supplier and unit cost will be applied automatically - review before sending.`,
      confirmLabel: 'Create PO',
    });
    if (!confirmed) return;
    try {
      const po = await createPo.mutateAsync({ itemId: row.itemId, warehouseId: row.warehouseId, qty: row.qty });
      addToast('Draft purchase order created', 'success');
      router.push(`/procurement/purchase-orders/${po.id}`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to create purchase order', 'error');
    }
  };

  const handleCreateWo = async (row: { itemId: string; itemSku: string; warehouseId: string; qty: number }) => {
    const confirmed = await confirm({
      title: 'Create Work Order',
      message: `Create a draft work order to manufacture ${formatQuantity(row.qty)} of ${row.itemSku}? Materials will be populated from its approved BOM.`,
      confirmLabel: 'Create Work Order',
    });
    if (!confirmed) return;
    try {
      const wo = await createWo.mutateAsync({ itemId: row.itemId, warehouseId: row.warehouseId, qty: row.qty });
      addToast('Draft work order created', 'success');
      router.push(`/manufacturing/work-orders/${wo.id}`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to create work order', 'error');
    }
  };

  const itemColumns: Column<MrpItemRow>[] = useMemo(() => [
    { key: 'itemSku', header: 'Item SKU', sortable: true, className: 'font-medium text-slate-900' },
    { key: 'itemDescription', header: 'Description', sortable: true },
    { key: 'warehouseName', header: 'Warehouse', sortable: true },
    { key: 'totalDemand', header: 'Total Demand', sortable: true, align: 'right', render: (row) => formatQuantity(row.totalDemand) },
    { key: 'totalOutstanding', header: 'Outstanding', sortable: true, align: 'right', render: (row) => formatQuantity(row.totalOutstanding) },
    { key: 'availableStock', header: 'Available Stock', sortable: true, align: 'right', render: (row) => formatQuantity(row.availableStock) },
    {
      key: 'netShortage',
      header: 'Net Shortage',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={`font-medium ${row.netShortage > 0 ? 'text-red-600' : 'text-slate-900'}`}>
          {formatQuantity(row.netShortage)}
        </span>
      ),
    },
    {
      key: 'resupply',
      header: 'Resupply',
      render: (row) => (row.netShortage > 0 ? <ResupplyHint item={row} /> : '-'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        if (row.netShortage <= 0 || (!row.hasActiveSupplier && !row.hasActiveBom)) return null;
        return (
          <div className="flex gap-2">
            {row.hasActiveSupplier && (
              <Button
                size="sm"
                variant="secondary"
                disabled={createPo.isPending}
                onClick={() => handleCreatePo({ itemId: row.itemId, itemSku: row.itemSku, warehouseId: row.warehouseId, qty: row.netShortage })}
              >
                Create PO
              </Button>
            )}
            {row.hasActiveBom && (
              <Button
                size="sm"
                variant="secondary"
                disabled={createWo.isPending}
                onClick={() => handleCreateWo({ itemId: row.itemId, itemSku: row.itemSku, warehouseId: row.warehouseId, qty: row.netShortage })}
              >
                Create Work Order
              </Button>
            )}
          </div>
        );
      },
    },
  ], [createPo.isPending, createWo.isPending]);

  const workOrderColumns: Column<MrpWorkOrderRow>[] = useMemo(() => [
    {
      key: 'workOrderNo',
      header: 'WO#',
      sortable: true,
      render: (row) => (
        <Link
          href={`/manufacturing/work-orders/${row.workOrderId}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.workOrderNo}
        </Link>
      ),
    },
    {
      key: 'workOrderStatus',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={getStatusVariant(row.workOrderStatus)}>
          {row.workOrderStatus.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    { key: 'warehouseName', header: 'Warehouse', sortable: true },
    { key: 'itemSku', header: 'Item SKU', sortable: true, className: 'text-slate-900' },
    { key: 'qtyRequired', header: 'Required', sortable: true, align: 'right', render: (row) => formatQuantity(row.qtyRequired) },
    { key: 'qtyIssued', header: 'Issued', sortable: true, align: 'right', render: (row) => formatQuantity(row.qtyIssued) },
    { key: 'qtyOutstanding', header: 'Outstanding', sortable: true, align: 'right', render: (row) => formatQuantity(row.qtyOutstanding) },
    { key: 'availableStock', header: 'Available', sortable: true, align: 'right', render: (row) => formatQuantity(row.availableStock) },
    {
      key: 'shortage',
      header: 'Shortage',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={`font-medium ${row.shortage > 0 ? 'text-red-600' : 'text-slate-900'}`}>
          {formatQuantity(row.shortage)}
        </span>
      ),
    },
    {
      key: 'resupply',
      header: 'Resupply',
      render: (row) => (row.shortage > 0 ? <ResupplyHint item={row} /> : '-'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        if (row.shortage <= 0 || !row.hasActiveSupplier) return null;
        return (
          <Button
            size="sm"
            variant="secondary"
            disabled={createPo.isPending}
            onClick={() => handleCreatePo({ itemId: row.itemId, itemSku: row.itemSku, warehouseId: row.warehouseId, qty: row.shortage })}
          >
            Create PO
          </Button>
        );
      },
    },
  ], [createPo.isPending]);

  const salesOrderColumns: Column<MrpSalesOrderRow>[] = useMemo(() => [
    {
      key: 'orderNo',
      header: 'Order #',
      sortable: true,
      render: (row) => (
        <Link
          href={`/sales/${row.salesOrderId}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.orderNo}
        </Link>
      ),
    },
    { key: 'customerName', header: 'Customer', sortable: true, render: (row) => row.customerName || '-' },
    { key: 'warehouseName', header: 'Warehouse', sortable: true },
    {
      key: 'demandType',
      header: 'Type',
      sortable: true,
      render: (row) => (
        <Badge variant={row.demandType === 'ASSEMBLY' ? 'info' : 'default'}>
          {row.demandType === 'ASSEMBLY' ? 'Assembly' : 'Component'}
        </Badge>
      ),
    },
    { key: 'itemSku', header: 'Item SKU', sortable: true, className: 'text-slate-900' },
    { key: 'qtyRequired', header: 'Required', sortable: true, align: 'right', render: (row) => formatQuantity(row.qtyRequired) },
    { key: 'availableStock', header: 'Available', sortable: true, align: 'right', render: (row) => formatQuantity(row.availableStock) },
    {
      key: 'shortage',
      header: 'Shortage',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={`font-medium ${row.shortage > 0 ? 'text-red-600' : 'text-slate-900'}`}>
          {formatQuantity(row.shortage)}
        </span>
      ),
    },
    {
      key: 'resupply',
      header: 'Resupply',
      render: (row) => (row.shortage > 0 ? <ResupplyHint item={row} /> : '-'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        if (row.shortage <= 0 || (!row.hasActiveSupplier && !row.hasActiveBom)) return null;
        return (
          <div className="flex gap-2">
            {row.hasActiveSupplier && (
              <Button
                size="sm"
                variant="secondary"
                disabled={createPo.isPending}
                onClick={() => handleCreatePo({ itemId: row.itemId, itemSku: row.itemSku, warehouseId: row.warehouseId, qty: row.shortage })}
              >
                Create PO
              </Button>
            )}
            {row.hasActiveBom && (
              <Button
                size="sm"
                variant="secondary"
                disabled={createWo.isPending}
                onClick={() => handleCreateWo({ itemId: row.itemId, itemSku: row.itemSku, warehouseId: row.warehouseId, qty: row.shortage })}
              >
                Create Work Order
              </Button>
            )}
          </div>
        );
      },
    },
  ], [createPo.isPending, createWo.isPending]);

  const shortageItems = useMemo(
    () => itemSummaryAll.filter((item) => item.netShortage > 0),
    [itemSummaryAll]
  );

  const totalShortageQty = useMemo(
    () => itemSummaryAll.reduce((sum, item) => sum + Math.max(0, item.netShortage), 0),
    [itemSummaryAll]
  );

  const handleExportCsv = () => {
    let csvContent = '';

    if (activeTab === 'by-item') {
      csvContent = 'Item SKU,Description,Warehouse,Total Demand,Outstanding,Available Stock,Net Shortage\n';
      itemSummary.forEach((item) => {
        csvContent += `"${item.itemSku}","${item.itemDescription}","${item.warehouseName}",${item.totalDemand},${item.totalOutstanding},${item.availableStock},${item.netShortage}\n`;
      });
    } else if (activeTab === 'by-work-order') {
      csvContent = 'WO#,Status,Warehouse,Item SKU,Required,Issued,Outstanding,Available,Shortage\n';
      workOrderDemand.forEach((wo) => {
        csvContent += `"${wo.workOrderNo}","${wo.workOrderStatus}","${wo.warehouseName}","${wo.itemSku}",${wo.qtyRequired},${wo.qtyIssued},${wo.qtyOutstanding},${wo.availableStock},${wo.shortage}\n`;
      });
    } else {
      csvContent = 'Order #,Customer,Warehouse,Type,Item SKU,Required,Available,Shortage\n';
      salesOrderDemand.forEach((so) => {
        csvContent += `"${so.orderNo}","${so.customerName || ''}","${so.warehouseName}","${so.demandType}","${so.itemSku}",${so.qtyRequired},${so.availableStock},${so.shortage}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mrp-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Breadcrumbs />
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Breadcrumbs />
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Failed to load MRP data</h2>
          <p className="mt-2 text-slate-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Material Requirements Planning</h1>
          <p className="text-sm text-slate-500 mt-1">
            View material demand and shortages across work orders
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportCsv}>
          <DownloadIcon />
          Export CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Items with Demand"
          value={formatNumber(itemSummaryAll.length)}
          icon={<PackageIcon />}
          iconColor="blue"
        />
        <StatCard
          title="Items with Shortages"
          value={formatNumber(shortageItems.length)}
          icon={<AlertIcon />}
          iconColor="red"
          alert={shortageItems.length > 0}
        />
        <StatCard
          title="Total Shortage Qty"
          value={formatQuantity(totalShortageQty)}
          icon={<TrendDownIcon />}
          iconColor="yellow"
          alert={totalShortageQty > 0}
        />
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Requirements</CardTitle>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'by-item'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setActiveTab('by-item')}
              >
                By Item
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'by-work-order'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setActiveTab('by-work-order')}
              >
                By Work Order
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'by-sales-order'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setActiveTab('by-sales-order')}
              >
                By Sales Order
              </button>
            </div>
          </div>
          <div className="mt-3">
            <Input
              placeholder="Search by item SKU, description, warehouse, order #, WO#, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'by-item' ? (
            <DataTable
              columns={itemColumns}
              data={itemSummary}
              keyField="rowId"
              variant="embedded"
              stickyFirstColumn
              stickyHeader
              maxBodyHeight="65vh"
              rowClassName={(row) => (row.netShortage > 0 ? 'bg-red-50' : undefined)}
              emptyState={
                search
                  ? { title: 'No matching items', description: 'Try a different search term.' }
                  : { title: 'No material requirements found', description: 'No open work orders currently need materials.' }
              }
            />
          ) : activeTab === 'by-work-order' ? (
            <DataTable
              columns={workOrderColumns}
              data={workOrderDemand}
              keyField="rowId"
              variant="embedded"
              stickyFirstColumn
              stickyHeader
              maxBodyHeight="65vh"
              rowClassName={(row) => (row.shortage > 0 ? 'bg-red-50' : undefined)}
              emptyState={
                search
                  ? { title: 'No matching work orders', description: 'Try a different search term.' }
                  : { title: 'No work order demand found', description: 'No open work orders currently need materials.' }
              }
            />
          ) : (
            <DataTable
              columns={salesOrderColumns}
              data={salesOrderDemand}
              keyField="rowId"
              variant="embedded"
              stickyFirstColumn
              stickyHeader
              maxBodyHeight="65vh"
              rowClassName={(row) => (row.shortage > 0 ? 'bg-red-50' : undefined)}
              emptyState={
                search
                  ? { title: 'No matching sales orders', description: 'Try a different search term.' }
                  : { title: 'No sales order demand found', description: 'No open sales orders currently need raw materials.' }
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'RELEASED':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898M18.75 19.5l3-3m0 0l-3-3m3 3H15" />
    </svg>
  );
}
