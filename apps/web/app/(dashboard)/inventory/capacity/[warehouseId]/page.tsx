'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { UtilizationBar } from '@/components/ui/utilization-bar';
import { Spinner } from '@/components/ui/spinner';
import { useWarehouse, useZoneCapacity } from '@/lib/queries';
import { formatNumber, formatPercent } from '@/lib/format';
import { getUtilizationVariant } from '@/lib/utils/capacity';
import type { ZoneCapacity } from '@nerva/shared';

export default function WarehouseZoneCapacityPage() {
  const params = useParams();
  const warehouseId = params.warehouseId as string;

  const { data: warehouse, isLoading: warehouseLoading } = useWarehouse(warehouseId);
  const { data: zones, isLoading: zonesLoading } = useZoneCapacity(warehouseId);

  const isLoading = warehouseLoading || zonesLoading;

  const totals = (zones ?? []).reduce(
    (acc, z) => ({
      capacity: acc.capacity + z.capacityPallets,
      occupied: acc.occupied + z.occupiedPallets,
      available: acc.available + z.availablePallets,
    }),
    { capacity: 0, occupied: 0, available: 0 },
  );
  const totalUtilizationPct = totals.capacity > 0 ? (totals.occupied / totals.capacity) * 100 : 0;

  const columns: Column<ZoneCapacity>[] = [
    { key: 'binType', header: 'Zone' },
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
      width: '220px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <UtilizationBar utilizationPct={row.utilizationPct} className="w-24" />
          <span className="text-sm tabular-nums">{formatPercent(row.utilizationPct, 0)}</span>
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
  ];

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <Link href="/inventory/capacity" className="text-sm text-primary-600 hover:underline mb-1 inline-block">
          &larr; Back to Warehouse Capacity
        </Link>
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-dark-primary">
          {warehouse?.name ?? 'Warehouse'} &mdash; Capacity by Zone
        </h1>
        <p className="text-text-muted dark:text-text-dark-muted mt-1">
          Pallet-position utilization broken down by bin type.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Pallet Positions" value={formatNumber(totals.capacity)} iconColor="blue" />
            <StatCard title="Occupied" value={formatNumber(totals.occupied)} iconColor="orange" />
            <StatCard title="Available" value={formatNumber(totals.available)} iconColor="green" />
            <StatCard
              title="Capacity Used"
              value={formatPercent(totalUtilizationPct, 0)}
              iconColor={totalUtilizationPct > 90 ? 'red' : totalUtilizationPct >= 75 ? 'yellow' : 'green'}
              alert={totalUtilizationPct > 90}
            />
          </div>

          <DataTable
            columns={columns}
            data={zones ?? []}
            keyField="binType"
            emptyState={{
              title: 'No zone capacity data',
              description: 'Add bins to this warehouse to start tracking capacity.',
            }}
          />
        </>
      )}
    </div>
  );
}
