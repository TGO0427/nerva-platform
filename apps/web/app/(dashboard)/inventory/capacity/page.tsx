'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { UtilizationBar } from '@/components/ui/utilization-bar';
import { Spinner } from '@/components/ui/spinner';
import { useWarehouseCapacity, useInboundForecast } from '@/lib/queries';
import { formatNumber, formatPercent } from '@/lib/format';
import { getUtilizationVariant } from '@/lib/utils/capacity';
import type { WarehouseCapacity } from '@nerva/shared';

type CapacityRow = WarehouseCapacity & {
  due7d: number;
  due14d: number;
  due30d: number;
  forecast14dPct: number;
};

export default function WarehouseCapacityPage() {
  const router = useRouter();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouseCapacity();
  const { data: forecast, isLoading: forecastLoading } = useInboundForecast();

  const isLoading = warehousesLoading || forecastLoading;

  const forecastByWarehouse = new Map((forecast ?? []).map((f) => [f.warehouseId, f]));
  const unassigned = forecastByWarehouse.get(null);

  const rows: CapacityRow[] = (warehouses ?? []).map((w) => {
    const f = forecastByWarehouse.get(w.warehouseId);
    const due7d = f?.due7d ?? 0;
    const due14d = f?.due14d ?? 0;
    const due30d = f?.due30d ?? 0;
    const forecast14dPct =
      w.capacityPallets > 0 ? ((w.occupiedPallets + due14d) / w.capacityPallets) * 100 : 0;
    return { ...w, due7d, due14d, due30d, forecast14dPct };
  });

  const totals = rows.reduce(
    (acc, w) => ({
      capacity: acc.capacity + w.capacityPallets,
      occupied: acc.occupied + w.occupiedPallets,
      available: acc.available + w.availablePallets,
      due14d: acc.due14d + w.due14d,
    }),
    { capacity: 0, occupied: 0, available: 0, due14d: 0 },
  );
  const totalUtilizationPct = totals.capacity > 0 ? (totals.occupied / totals.capacity) * 100 : 0;

  const columns: Column<CapacityRow>[] = [
    { key: 'warehouseName', header: 'Warehouse' },
    {
      key: 'capacityPallets',
      header: 'Capacity',
      align: 'right',
      render: (row) => formatNumber(row.capacityPallets),
    },
    {
      key: 'occupiedPallets',
      header: 'Occupied',
      align: 'right',
      render: (row) => formatNumber(row.occupiedPallets),
    },
    {
      key: 'availablePallets',
      header: 'Available',
      align: 'right',
      render: (row) => formatNumber(row.availablePallets),
    },
    {
      key: 'utilizationPct',
      header: 'Utilization',
      width: '200px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <UtilizationBar utilizationPct={row.utilizationPct} className="w-24" />
          <span className="text-sm tabular-nums">{formatPercent(row.utilizationPct, 0)}</span>
        </div>
      ),
    },
    {
      key: 'due7d',
      header: 'Inbound (7d)',
      align: 'right',
      render: (row) => formatNumber(row.due7d),
    },
    {
      key: 'due14d',
      header: 'Inbound (14d)',
      align: 'right',
      render: (row) => formatNumber(row.due14d),
    },
    {
      key: 'due30d',
      header: 'Inbound (30d)',
      align: 'right',
      render: (row) => formatNumber(row.due30d),
    },
    {
      key: 'forecast14dPct',
      header: 'Forecast (14d)',
      width: '200px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <UtilizationBar utilizationPct={row.forecast14dPct} className="w-24" />
          <span className="text-sm tabular-nums">{formatPercent(row.forecast14dPct, 0)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={getUtilizationVariant(row.utilizationPct)}>
          {row.utilizationPct > 90 ? 'Over 90%' : row.utilizationPct >= 75 ? 'Near capacity' : 'OK'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '260px',
      render: (row) => (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link
            href={`/master-data/warehouses/${row.warehouseId}#bins`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 hover:underline whitespace-nowrap"
          >
            View Bins
          </Link>
          <Link
            href={`/import-schedule?warehouseId=${row.warehouseId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 hover:underline whitespace-nowrap"
          >
            Inbound Shipments
          </Link>
          <Link
            href={`/inventory/ibts?fromWarehouseId=${row.warehouseId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 hover:underline whitespace-nowrap"
          >
            Create Transfer
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-dark-primary">Warehouse Capacity</h1>
        <p className="text-text-muted dark:text-text-dark-muted mt-1">
          Current pallet-position utilization and inbound import forecast across your warehouses.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard title="Total Pallet Positions" value={formatNumber(totals.capacity)} iconColor="blue" />
            <StatCard title="Occupied" value={formatNumber(totals.occupied)} iconColor="orange" />
            <StatCard title="Available" value={formatNumber(totals.available)} iconColor="green" />
            <StatCard
              title="Capacity Used"
              value={formatPercent(totalUtilizationPct, 0)}
              iconColor={totalUtilizationPct > 90 ? 'red' : totalUtilizationPct >= 75 ? 'yellow' : 'green'}
              alert={totalUtilizationPct > 90}
            />
            <StatCard title="Inbound Pallets (14d)" value={formatNumber(totals.due14d)} iconColor="purple" />
          </div>

          <DataTable
            columns={columns}
            data={rows}
            keyField="warehouseId"
            onRowClick={(row) => router.push(`/inventory/capacity/${row.warehouseId}`)}
            stickyHeader
            maxBodyHeight="65vh"
            emptyState={{
              title: 'No warehouse capacity data',
              description: 'Add bins to a warehouse to start tracking capacity.',
            }}
          />

          {unassigned && (unassigned.due30d > 0) && (
            <p className="text-sm text-text-muted dark:text-text-dark-muted mt-3">
              {formatNumber(unassigned.due30d)} additional pallet{unassigned.due30d === 1 ? '' : 's'} inbound
              in the next 30 days with no assigned warehouse yet &mdash; link the shipment to a purchase order
              to include {unassigned.due30d === 1 ? 'it' : 'them'} in the forecast above.
            </p>
          )}
        </>
      )}
    </div>
  );
}
