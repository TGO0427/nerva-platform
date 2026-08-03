'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useItem, useDeleteItem } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { data: item, isLoading } = useItem(id);
  const deleteItem = useDeleteItem();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Item not found</h2>
        <p className="text-slate-500 mt-1">The item you are looking for does not exist.</p>
        <Link href="/master-data/items" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to items
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      {/* Header */}
      <div className="bg-primary-700 text-white p-6 rounded-lg mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{item.sku}</h1>
            <p className="text-primary-100 text-sm mt-1">{item.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="bg-white text-primary-700 hover:bg-primary-tint"
              onClick={() => router.push(`/master-data/items/${id}/edit`)}
            >
              Edit Item
            </Button>
            <Button
              variant="danger"
              disabled={deleteItem.isPending}
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Delete Item',
                  message: 'Are you sure you want to delete this item? This cannot be undone.',
                  confirmLabel: 'Delete',
                  variant: 'danger',
                });
                if (!confirmed) return;
                try {
                  await deleteItem.mutateAsync(id);
                  addToast('Item deleted', 'success');
                  router.push('/master-data/items');
                } catch (e: any) {
                  addToast(e?.response?.data?.message || 'Failed to delete item', 'error');
                }
              }}
            >
              {deleteItem.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">SKU</div>
                <div className="mt-1">{item.sku}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">Unit of Measure</div>
                <div className="mt-1">{item.uom}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm font-medium text-slate-500">Description</div>
                <div className="mt-1">{item.description}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">Weight</div>
                <div className="mt-1">{item.weightKg !== null ? `${item.weightKg} kg` : '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">Status</div>
                <div className="mt-1">
                  <Badge variant={item.isActive ? 'success' : 'danger'}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">HS Code</div>
                <div className="mt-1">{item.hsCode || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">Country of Origin</div>
                <div className="mt-1">{item.countryOfOrigin || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Record Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Record Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">Created</div>
                <div className="mt-1">{formatDateTime(item.createdAt)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">Last Updated</div>
                <div className="mt-1">{formatDateTime(item.updatedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
