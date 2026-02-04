'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { useSuppliers, useQueryParams } from '@/lib/queries';
import type { Supplier } from '@nerva/shared';

export default function SuppliersPage() {
  const router = useRouter();
  const { params, setPage, setSort, setSearch } = useQueryParams();
  const { data, isLoading } = useSuppliers(params);

  const columns: Column<Supplier>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="font-medium text-primary-600">{row.code || '-'}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'contactPerson',
      header: 'Contact',
      render: (row) => row.contactPerson || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => row.email || '-',
    },
    {
      key: 'phone',
      header: 'Phone',
      width: '150px',
      render: (row) => row.phone || '-',
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
  ];

  const handleRowClick = (row: Supplier) => {
    router.push(`/master-data/suppliers/${row.id}`);
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage your supplier database</p>
        </div>
        <Link href="/master-data/suppliers/new">
          <Button>
            <PlusIcon />
            Add Supplier
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search suppliers by name or code..."
          className="max-w-md"
          value={params.search || ''}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        keyField="id"
        isLoading={isLoading}
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        onSort={setSort}
        sortKey={params.sortBy}
        sortOrder={params.sortOrder}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <BuildingIcon />,
          title: 'No suppliers found',
          description: params.search
            ? 'Try adjusting your search criteria'
            : 'Get started by adding your first supplier',
          action: !params.search && (
            <Link href="/master-data/suppliers/new">
              <Button>Add Supplier</Button>
            </Link>
          ),
        }}
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}
