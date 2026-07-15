'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { RelatedRecordsPanel } from '@/components/ui/record-panels';
import { LineWorkflowActions } from './line-workflow-actions';
import {
  useImportShipment,
  useUpdateImportShipmentLineStatus,
  useDeleteImportShipment,
} from '@/lib/queries';
import { formatDate } from '@/lib/format';
import {
  ALL_IMPORT_SHIPMENT_STATUSES,
  STATUS_LABELS,
  DELAYED_STATUSES,
  POST_ARRIVAL_STATUSES,
  getVesselTrackingUrl,
} from '@nerva/shared';
import type { ImportShipmentLine, ImportShipmentStatus, ImportShipmentTransportMode } from '@nerva/shared';

const STATUS_OPTIONS = ALL_IMPORT_SHIPMENT_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

export default function ImportShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { data: shipment, isLoading } = useImportShipment(params.id);
  const updateLineStatus = useUpdateImportShipmentLineStatus();
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

  const handleStatusChange = async (line: ImportShipmentLine, status: ImportShipmentStatus) => {
    try {
      await updateLineStatus.mutateAsync({ shipmentId: shipment.id, lineId: line.id, status });
      addToast(`Line ${line.lineNo} marked as ${STATUS_LABELS[status].toLowerCase()}`, 'success');
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

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{shipment.reference}</h1>
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Incoterm" value={shipment.incoterm || '—'} />
            <Field label="Lines" value={String(shipment.lines.length)} />
            {shipment.notes && (
              <div className="md:col-span-3">
                <Field label="Notes" value={shipment.notes} />
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {shipment.purchaseOrderId && (
        <div className="mb-6">
          <RelatedRecordsPanel
            items={[{
              label: 'Purchase Order',
              description: 'Source order for this shipment',
              href: `/procurement/purchase-orders/${shipment.purchaseOrderId}`,
              badge: 'Purchase Order',
            }]}
          />
        </div>
      )}

      <div className="space-y-4">
        {shipment.lines.map((line) => (
          <Card key={line.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Line {line.lineNo}: {line.productDescription}
                </CardTitle>
                <Badge variant={getStatusVariant(line.status)}>{STATUS_LABELS[line.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                <Field label="Transport Mode" value={line.transportMode} />
                <Field
                  label="Week"
                  value={
                    line.weekStartDate
                      ? `${formatDate(line.weekStartDate)}${line.weekEndDate ? ` – ${formatDate(line.weekEndDate)}` : ''}`
                      : '—'
                  }
                />
                <Field label="Destination" value={line.destinationPort || '—'} />
                <Field label="Carrier" value={line.carrier || '—'} />
                <VesselField transportMode={line.transportMode} vesselOrAwb={line.vesselOrAwb} />
                <Field label="Quantity" value={line.quantity != null ? String(line.quantity) : '—'} />
                <Field label="CBM" value={line.cbm != null ? String(line.cbm) : '—'} />
                <Field label="Pallet Qty" value={line.palletQty != null ? String(line.palletQty) : '—'} />
                {line.notes && (
                  <div className="lg:col-span-3">
                    <Field label="Notes" value={line.notes} />
                  </div>
                )}
              </dl>
              <div className="mb-4 pb-4 border-b border-slate-100">
                <LineWorkflowActions shipmentId={shipment.id} line={line} />
              </div>

              <div className="max-w-xs">
                <label className="block text-sm font-medium text-slate-700 mb-1">Status (override)</label>
                <Select
                  value={line.status}
                  onChange={(e) => handleStatusChange(line, e.target.value as ImportShipmentStatus)}
                  options={STATUS_OPTIONS}
                  disabled={updateLineStatus.isPending}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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

function VesselField({
  transportMode,
  vesselOrAwb,
}: {
  transportMode: ImportShipmentTransportMode;
  vesselOrAwb: string | null;
}) {
  const trackingUrl = vesselOrAwb ? getVesselTrackingUrl(transportMode, vesselOrAwb) : null;

  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {transportMode === 'AIR' ? 'AWB Number' : 'Vessel Name'}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-900 flex items-center gap-1">
        {vesselOrAwb || '—'}
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={transportMode === 'AIR' ? 'Track AWB' : 'Track vessel on VesselFinder'}
            className="text-primary-600 hover:text-primary-700"
          >
            <ExternalLinkIcon />
          </a>
        )}
      </dd>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}

function getStatusVariant(status: ImportShipmentStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'CANCELLED') return 'danger';
  if (DELAYED_STATUSES.includes(status)) return 'warning';
  if (POST_ARRIVAL_STATUSES.includes(status) || status === 'STORED' || status === 'ARCHIVED') return 'success';
  return 'info';
}
