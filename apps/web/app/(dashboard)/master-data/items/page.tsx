'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { useItems, useQueryParams } from '@/lib/queries';
import type { Item } from '@nerva/shared';

export default function ItemsPage() {
  const router = useRouter();
  const { params, setPage, setSort, setSearch } = useQueryParams();
  const { data, isLoading } = useItems(params);

  const columns: Column<Item>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.sku}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'uom',
      header: 'UOM',
      width: '100px',
    },
    {
      key: 'weightKg',
      header: 'Weight (kg)',
      width: '120px',
      render: (row) => row.weightKg?.toFixed(2) ?? '-',
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
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      width: '120px',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleRowClick = (row: Item) => {
    router.push(`/master-data/items/${row.id}`);
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <p className="text-gray-500 mt-1">Manage your product catalog</p>
        </div>
        <Link href="/master-data/items/new">
          <Button>
            <PlusIcon />
            Add Item
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search items by SKU or description..."
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
          icon: <BoxIcon />,
          title: 'No items found',
          description: params.search
            ? 'Try adjusting your search criteria'
            : 'Get started by adding your first item',
          action: !params.search && (
            <Link href="/master-data/items/new">
              <Button>Add Item</Button>
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

function BoxIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
