'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { useItem, useStockOnHand, useLedgerHistory, useQueryParams, StockSnapshot, LedgerEntry } from '@/lib/queries';

export default function StockDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { params: queryParams, setPage } = useQueryParams({ limit: 10 });

  const { data: item, isLoading: itemLoading } = useItem(itemId);
  const { data: stockData, isLoading: stockLoading } = useStockOnHand(itemId);
  const { data: ledgerData, isLoading: ledgerLoading } = useLedgerHistory(itemId, queryParams);

  const stockColumns: Column<StockSnapshot>[] = [
    {
      key: 'warehouseName',
      header: 'Warehouse',
    },
    {
      key: 'binCode',
      header: 'Bin',
      render: (row) => (
        <span className="font-mono text-sm">{row.binCode}</span>
      ),
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (row) => {
        if (!row.expiryDate) return '-';
        const expiry = new Date(row.expiryDate);
        const today = new Date();
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isExpired = daysUntil < 0;
        const isCritical = daysUntil >= 0 && daysUntil <= 7;
        const isWarning = daysUntil > 7 && daysUntil <= 30;

        return (
          <span className={
            isExpired ? 'text-red-600 font-medium' :
            isCritical ? 'text-orange-600 font-medium' :
            isWarning ? 'text-yellow-600' : ''
          }>
            {expiry.toLocaleDateString()}
            {isExpired && ' (Expired)'}
            {isCritical && !isExpired && ` (${daysUntil}d)`}
          </span>
        );
      },
    },
    {
      key: 'qtyOnHand',
      header: 'On Hand',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">{row.qtyOnHand}</span>
      ),
    },
    {
      key: 'qtyReserved',
      header: 'Reserved',
      className: 'text-right',
      render: (row) => (
        <span className="text-orange-600">{row.qtyReserved}</span>
      ),
    },
    {
      key: 'qtyAvailable',
      header: 'Available',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium text-green-600">{row.qtyAvailable}</span>
      ),
    },
  ];

  const ledgerColumns: Column<LedgerEntry>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <Badge variant={getReasonVariant(row.reason)}>
          {row.reason}
        </Badge>
      ),
    },
    {
      key: 'qtyChange',
      header: 'Qty Change',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyChange >= 0 ? 'text-green-600' : 'text-red-600'}>
          {row.qtyChange >= 0 ? '+' : ''}{row.qtyChange}
        </span>
      ),
    },
    {
      key: 'qtyAfter',
      header: 'Balance',
      className: 'text-right',
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
  ];

  if (itemLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Item not found</h2>
      </div>
    );
  }

  const totalOnHand = stockData?.reduce((sum, s) => sum + s.qtyOnHand, 0) || 0;
  const totalReserved = stockData?.reduce((sum, s) => sum + s.qtyReserved, 0) || 0;
  const totalAvailable = stockData?.reduce((sum, s) => sum + s.qtyAvailable, 0) || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{item.sku}</h1>
          <p className="text-slate-500 mt-1">{item.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/master-data/items/${item.id}`}>
            <Button variant="secondary">Edit Item</Button>
          </Link>
          <Link href="/inventory/transfers">
            <Button>Transfer Stock</Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-slate-900">{totalOnHand}</div>
            <p className="text-sm text-slate-500">Total On Hand</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-orange-600">{totalReserved}</div>
            <p className="text-sm text-slate-500">Reserved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{totalAvailable}</div>
            <p className="text-sm text-slate-500">Available</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock by location */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Stock by Location</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={stockColumns}
            data={stockData || []}
            keyField="binId"
            isLoading={stockLoading}
            emptyState={{
              title: 'No stock found',
              description: 'This item has no stock in any location',
            }}
          />
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={ledgerColumns}
            data={ledgerData?.data || []}
            keyField="id"
            isLoading={ledgerLoading}
            pagination={ledgerData?.meta ? {
              page: ledgerData.meta.page,
              limit: ledgerData.meta.limit,
              total: ledgerData.meta.total || 0,
              totalPages: ledgerData.meta.totalPages || 1,
            } : undefined}
            onPageChange={setPage}
            emptyState={{
              title: 'No transactions',
              description: 'No stock movements recorded for this item',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function getReasonVariant(reason: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (reason) {
    case 'RECEIVE':
    case 'RETURN':
    case 'IBT_IN':
      return 'success';
    case 'PICK':
    case 'SHIP':
    case 'IBT_OUT':
      return 'info';
    case 'ADJUST':
    case 'TRANSFER':
      return 'warning';
    case 'SCRAP':
      return 'danger';
    default:
      return 'default';
  }
}
