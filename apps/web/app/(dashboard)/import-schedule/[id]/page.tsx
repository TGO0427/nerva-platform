'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useImportShipment, useUpdateImportShipmentStatus, useDeleteImportShipment } from '@/lib/queries';
import { formatDate } from '@/lib/format';
import type { ImportShipmentStatus } from '@nerva/shared';

const STATUS_FLOW: Record<string, ImportShipmentStatus[]> = {
  PLANNED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED', 'DELAYED', 'CANCELLED'],
  DELAYED: ['IN_TRANSIT', 'ARRIVED', 'CANCELLED'],
  ARRIVED: [],
  CANCELLED: ['PLANNED'],
};

export default function ImportShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { data: shipment, isLoading } = useImportShipment(params.id);
  const updateStatus = useUpdateImportShipmentStatus();
  const deleteShipment = useDeleteImportShipment();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-24 text-slate-500">Shipment not found</div>
    );
  }

  const handleStatusChange = async (status: ImportShipmentStatus) => {
    try {
      await updateStatus.mutateAsync({ id: shipment.id, status });
      addToast(`Shipment marked as ${status.replace(/_/g, ' ').toLowerCase()}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete shipment',
      message: `Are you sure you want to delete shipment ${shipment.reference}? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteShipment.mutateAsync(shipment.id);
      addToast('Shipment deleted', 'success');
      router.push('/import-schedule');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete shipment', 'error');
    }
  };

  const nextStatuses = STATUS_FLOW[shipment.status] || [];

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{shipment.reference}</h1>
            <Badge variant={getStatusVariant(shipment.status)}>
              {shipment.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">{shipment.supplierName || 'Unknown supplier'}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/import-schedule/${shipment.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteShipment.isPending}>
            Delete
          </Button>
        </div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="flex gap-2 mb-6">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange(status)}
              isLoading={updateStatus.isPending}
            >
              Mark as {status.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Transport Mode" value={shipment.transportMode} />
            <Field label="ETA" value={shipment.etaDate ? formatDate(shipment.etaDate) : '—'} />
            <Field label="Destination" value={shipment.destinationPort || '—'} />
            <Field label="Carrier" value={shipment.carrier || '—'} />
            <Field
              label={shipment.transportMode === 'AIR' ? 'AWB Number' : 'Vessel Name'}
              value={shipment.vesselOrAwb || '—'}
            />
            <Field label="Incoterm" value={shipment.incoterm || '—'} />
            <Field label="Quantity" value={shipment.quantity != null ? String(shipment.quantity) : '—'} />
            <Field label="CBM" value={shipment.cbm != null ? String(shipment.cbm) : '—'} />
            <Field label="Pallet Qty" value={shipment.palletQty != null ? String(shipment.palletQty) : '—'} />
            {shipment.notes && (
              <div className="lg:col-span-3">
                <Field label="Notes" value={shipment.notes} />
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'ARRIVED':
      return 'success';
    case 'IN_TRANSIT':
      return 'info';
    case 'DELAYED':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}
