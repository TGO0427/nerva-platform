'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailPageTemplate } from '@/components/templates';
import {
  useWorkstation,
  useUpdateWorkstation,
  useDeleteWorkstation,
} from '@/lib/queries/manufacturing';
import type { WorkstationStatus, WorkstationType } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const TYPE_OPTIONS = [
  { value: 'MACHINE', label: 'Machine' },
  { value: 'ASSEMBLY', label: 'Assembly' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'QC', label: 'Quality Control' },
];

export default function WorkstationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: workstation, isLoading, error } = useWorkstation(id);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workstationType: '',
    status: '',
    capacityPerHour: '',
    costPerHour: '',
  });

  const updateWorkstation = useUpdateWorkstation();
  const deleteWorkstation = useDeleteWorkstation();

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Workstation not found</h2>
          <p className="mt-2 text-slate-500">The workstation you're looking for doesn't exist.</p>
          <Link href="/manufacturing/workstations">
            <Button className="mt-4">Back to Workstations</Button>
          </Link>
        </div>
      </div>
    );
  }

  const startEditing = () => {
    if (workstation) {
      setFormData({
        name: workstation.name,
        description: workstation.description || '',
        workstationType: workstation.workstationType,
        status: workstation.status,
        capacityPerHour: workstation.capacityPerHour?.toString() || '',
        costPerHour: workstation.costPerHour?.toString() || '',
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    await updateWorkstation.mutateAsync({
      id,
      name: formData.name,
      description: formData.description || undefined,
      workstationType: formData.workstationType as WorkstationType,
      status: formData.status as WorkstationStatus,
      capacityPerHour: formData.capacityPerHour ? parseFloat(formData.capacityPerHour) : undefined,
      costPerHour: formData.costPerHour ? parseFloat(formData.costPerHour) : undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this workstation?')) return;
    await deleteWorkstation.mutateAsync(id);
    router.push('/manufacturing/workstations');
  };

  return (
    <DetailPageTemplate
      title={workstation?.code || 'Loading...'}
      subtitle="Workstation Details"
      isLoading={isLoading}
      headerActions={
        workstation && !isEditing && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={startEditing}>
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteWorkstation.isPending}>
              Delete
            </Button>
          </div>
        )
      }
    >
      {workstation && (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-500">Status</div>
              <div className="mt-1">
                <Badge variant={getStatusVariant(workstation.status)} >
                  {workstation.status}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Type</div>
              <div className="mt-1 text-lg font-semibold">
                {workstation.workstationType}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Capacity/Hour</div>
              <div className="mt-1 text-lg font-semibold">
                {workstation.capacityPerHour?.toLocaleString() || '-'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Cost/Hour</div>
              <div className="mt-1 text-lg font-semibold">
                {workstation.costPerHour ? `$${workstation.costPerHour.toFixed(2)}` : '-'}
              </div>
            </Card>
          </div>

          {/* Details */}
          <Card className="p-6">
            {isEditing ? (
              <>
                <h3 className="text-lg font-medium mb-4">Edit Workstation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.workstationType}
                      onChange={(e) => setFormData({ ...formData, workstationType: e.target.value })}
                      options={TYPE_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      options={STATUS_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Capacity Per Hour
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.capacityPerHour}
                      onChange={(e) => setFormData({ ...formData, capacityPerHour: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cost Per Hour
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPerHour}
                      onChange={(e) => setFormData({ ...formData, costPerHour: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={updateWorkstation.isPending}>
                    {updateWorkstation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-4">Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">Code</div>
                    <div className="mt-1 font-medium">{workstation.code}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Name</div>
                    <div className="mt-1">{workstation.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Type</div>
                    <div className="mt-1">{workstation.workstationType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Created</div>
                    <div className="mt-1">{new Date(workstation.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Updated</div>
                    <div className="mt-1">{new Date(workstation.updatedAt).toLocaleString()}</div>
                  </div>
                  {workstation.description && (
                    <div className="col-span-full">
                      <div className="text-sm text-slate-500">Description</div>
                      <div className="mt-1">{workstation.description}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </DetailPageTemplate>
  );
}

function getStatusVariant(status: WorkstationStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'MAINTENANCE':
      return 'warning';
    case 'INACTIVE':
    default:
      return 'default';
  }
}
