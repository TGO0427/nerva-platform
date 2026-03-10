'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ListPageTemplate } from '@/components/templates';
import { useAuth, hasPermission } from '@/lib/auth';
import { useAdminTenants, useAdminTenantStats, TenantWithStats } from '@/lib/queries/admin-tenants';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function AdminTenantsPage() {
  const { user } = useAuth();
  const { data: tenants, isLoading } = useAdminTenants();
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

  const tableData = tenants || [];
  const activeTenants = tableData.filter(t => t.isActive).length;
  const inactiveTenants = tableData.filter(t => !t.isActive).length;
  const totalUsers = tableData.reduce((sum, t) => sum + t.userCount, 0);

  const columns: Column<TenantWithStats>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Tenant Name',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{row.name}</span>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      width: '120px',
      render: (row) => (
        <span className="font-mono text-sm text-slate-600 dark:text-slate-300">{row.code || '-'}</span>
      ),
    },
    {
      key: 'userCount',
      header: 'Users',
      width: '100px',
      render: (row) => row.userCount,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ], []);

  const handleRowClick = (row: TenantWithStats) => {
    setExpandedTenantId(expandedTenantId === row.id ? null : row.id);
  };

  if (!hasPermission(user, 'system.admin')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">You need system admin permissions to view this page.</p>
      </div>
    );
  }

  return (
    <ListPageTemplate
      title="Tenant Management"
      subtitle="System-wide tenant overview (read-only)"
      stats={[
        {
          title: 'Total Tenants',
          value: tableData.length,
          icon: <BuildingIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Active',
          value: activeTenants,
          icon: <CheckCircleIcon />,
          iconColor: 'green',
        },
        {
          title: 'Inactive',
          value: inactiveTenants,
          icon: <XCircleIcon />,
          iconColor: 'red',
          alert: inactiveTenants > 0,
        },
        {
          title: 'Total Users',
          value: totalUsers,
          icon: <UsersSmIcon />,
          iconColor: 'gray',
        },
      ]}
      statsColumns={4}
    >
      <DataTable
        columns={columns}
        data={tableData}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        onRowClick={handleRowClick}
        emptyState={{
          icon: <BuildingLgIcon />,
          title: 'No tenants found',
          description: 'No tenants have been registered yet.',
        }}
      />

      {expandedTenantId && (
        <TenantDetailPanel
          tenantId={expandedTenantId}
          tenant={tableData.find(t => t.id === expandedTenantId)!}
          onClose={() => setExpandedTenantId(null)}
        />
      )}
    </ListPageTemplate>
  );
}

function TenantDetailPanel({
  tenantId,
  tenant,
  onClose,
}: {
  tenantId: string;
  tenant: TenantWithStats;
  onClose: () => void;
}) {
  const { data: stats, isLoading } = useAdminTenantStats(tenantId);

  return (
    <div className="mt-4 mx-4 mb-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {tenant.name} — Detail Stats
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatItem label="Users" value={stats.userCount} />
              <StatItem label="Sites" value={stats.siteCount} />
              <StatItem label="Items" value={stats.itemCount} />
              <StatItem label="Warehouses" value={stats.warehouseCount} />
              <StatItem label="Sales Orders" value={stats.orderCount} />
              <StatItem
                label="Last Activity"
                value={stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'None'}
              />
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Unable to load stats.</p>
          )}

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 space-y-1">
            <p><span className="font-medium">Tenant ID:</span> <span className="font-mono">{tenant.id}</span></p>
            <p><span className="font-medium">Code:</span> {tenant.code || 'N/A'}</p>
            <p><span className="font-medium">Created:</span> {new Date(tenant.createdAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function BuildingLgIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function UsersSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
