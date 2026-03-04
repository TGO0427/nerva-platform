'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { ListPageTemplate } from '@/components/templates';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse } from '@/lib/queries/warehouses';
import { useSites } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import type { Warehouse } from '@nerva/shared';

type WarehouseWithSite = Warehouse & { siteName?: string };

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function WarehousesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { data: warehouses, isLoading } = useWarehouses();
  const { data: sites } = useSites();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newSiteId, setNewSiteId] = useState('');

  const getSiteName = (siteId: string) => {
    const site = sites?.find(s => s.id === siteId);
    return site?.name || 'Unknown';
  };

  const tableData: WarehouseWithSite[] = useMemo(() => {
    let filtered = (warehouses || []).map(w => ({
      ...w,
      siteName: getSiteName(w.siteId),
    }));

    if (statusFilter === 'active') {
      filtered = filtered.filter(w => w.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(w => !w.isActive);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(q) ||
        (w.code && w.code.toLowerCase().includes(q)) ||
        (w.siteName && w.siteName.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [warehouses, sites, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWarehouse.mutateAsync({
        siteId: newSiteId,
        name: newName,
        code: newCode || undefined,
      });
      addToast('Warehouse created', 'success');
      setShowCreateForm(false);
      setNewName('');
      setNewCode('');
      setNewSiteId('');
    } catch {
      addToast('Failed to create warehouse', 'error');
    }
  };

  const handleToggleActive = async (e: React.MouseEvent, id: string, currentlyActive: boolean, name: string) => {
    e.stopPropagation();
    const action = currentlyActive ? 'deactivate' : 'activate';
    const confirmed = await confirm({
      title: `${currentlyActive ? 'Deactivate' : 'Activate'} Warehouse`,
      message: `Are you sure you want to ${action} "${name}"?`,
      confirmLabel: currentlyActive ? 'Deactivate' : 'Activate',
      variant: currentlyActive ? 'danger' : undefined,
    });
    if (!confirmed) return;
    try {
      await updateWarehouse.mutateAsync({ id, data: { isActive: !currentlyActive } });
      addToast(`Warehouse ${action}d`, 'success');
    } catch {
      addToast(`Failed to ${action} warehouse`, 'error');
    }
  };

  const handleRowClick = (row: WarehouseWithSite) => {
    router.push(`/master-data/warehouses/${row.id}`);
  };

  const handleExport = () => {
    const exportColumns = [
      { key: 'code', header: 'Code', getValue: (r: WarehouseWithSite) => r.code || '' },
      { key: 'name', header: 'Name' },
      { key: 'siteName', header: 'Site' },
      { key: 'isActive', header: 'Status', getValue: (r: WarehouseWithSite) => r.isActive ? 'Active' : 'Inactive' },
      { key: 'createdAt', header: 'Created', getValue: (r: WarehouseWithSite) => formatDateForExport(r.createdAt) },
    ];
    exportToCSV(tableData, exportColumns, generateExportFilename('warehouses'));
  };

  const allColumns: Column<WarehouseWithSite>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.name}</span>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      width: '120px',
      render: (row) => row.code || '-',
    },
    {
      key: 'siteName',
      header: 'Site',
      render: (row) => row.siteName || '-',
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (row) => (
        <Button
          variant={row.isActive ? 'danger' : 'primary'}
          size="sm"
          onClick={(e) => handleToggleActive(e as React.MouseEvent, row.id, row.isActive, row.name)}
        >
          {row.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'warehouses', alwaysVisible: ['name'] });

  const activeCount = warehouses?.filter(w => w.isActive).length || 0;
  const inactiveCount = warehouses?.filter(w => !w.isActive).length || 0;
  const totalCount = warehouses?.length || 0;

  return (
    <ListPageTemplate
      title="Warehouses"
      subtitle="Manage warehouse locations and storage bins"
      headerActions={
        <div className="flex gap-2">
          <ExportActions onExport={handleExport} />
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon />
              Add Warehouse
            </Button>
          )}
        </div>
      }
      stats={[
        {
          title: 'Total',
          value: totalCount,
          icon: <WarehouseSmIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Active',
          value: activeCount,
          icon: <CheckCircleIcon />,
          iconColor: 'green',
        },
        {
          title: 'Inactive',
          value: inactiveCount,
          icon: <XCircleIcon />,
          iconColor: 'red',
          alert: inactiveCount > 0,
        },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search warehouses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
      }
      filterActions={
        <ColumnToggle
          columns={allColumns}
          visibleKeys={visibleKeys}
          onToggle={toggleColumn}
          onReset={resetColumns}
          alwaysVisible={['name']}
        />
      }
    >
      {/* Inline Create Form */}
      {showCreateForm && (
        <div className="mb-4 p-4 rounded-xl border border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-slate-900 mb-3">Create New Warehouse</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Site *</label>
                <select
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Select a site...</option>
                  {sites?.filter(s => s.isActive).map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse Name *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Main Distribution Center"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g., WH-001"
                  maxLength={50}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" isLoading={createWarehouse.isPending}>
                Create Warehouse
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewName('');
                  setNewCode('');
                  setNewSiteId('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        columns={visibleColumns}
        data={tableData}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        onRowClick={handleRowClick}
        emptyState={{
          icon: <WarehouseIconLarge />,
          title: 'No warehouses found',
          description: search || statusFilter
            ? 'No warehouses match the selected filters'
            : 'Create a warehouse to manage storage locations',
          action: !search && !statusFilter && (
            <Button onClick={() => setShowCreateForm(true)}>Add Warehouse</Button>
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

function WarehouseSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
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

function WarehouseIconLarge() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}
