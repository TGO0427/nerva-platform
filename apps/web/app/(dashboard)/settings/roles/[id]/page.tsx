'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useRole,
  useUpdateRole,
  usePermissions,
  useRolePermissions,
  useSetRolePermissions,
  Permission,
} from '@/lib/queries';

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;

  const { data: role, isLoading: roleLoading } = useRole(roleId);
  const { data: allPermissions, isLoading: permissionsLoading } = usePermissions();
  const { data: rolePermissions, isLoading: rolePermissionsLoading } = useRolePermissions(roleId);
  const updateRole = useUpdateRole();
  const setRolePermissions = useSetRolePermissions();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false);

  // Initialize form when role data loads
  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
    }
  }, [role]);

  // Initialize selected permissions when role permissions load
  useEffect(() => {
    if (rolePermissions) {
      setSelectedPermissions(new Set(rolePermissions.map(p => p.id)));
      setHasPermissionChanges(false);
    }
  }, [rolePermissions]);

  const handleSaveDetails = async () => {
    try {
      await updateRole.mutateAsync({
        id: roleId,
        data: { name, description: description || undefined },
      });
      setIsEditingDetails(false);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
    setHasPermissionChanges(true);
  };

  const handleSavePermissions = async () => {
    try {
      await setRolePermissions.mutateAsync({
        roleId,
        permissionIds: Array.from(selectedPermissions),
      });
      setHasPermissionChanges(false);
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  };

  // Group permissions by module
  const groupedPermissions = (allPermissions || []).reduce((acc, permission) => {
    const module = permission.module || 'Other';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Role not found</h2>
        <Button className="mt-4" onClick={() => router.push('/settings/roles')}>
          Back to Roles
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
          <p className="text-gray-500 mt-1">
            {role.description || 'No description'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Role Details</CardTitle>
              {!isEditingDetails && (
                <Button variant="secondary" size="sm" onClick={() => setIsEditingDetails(true)}>
                  <EditIcon />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingDetails ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveDetails} isLoading={updateRole.isPending}>
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditingDetails(false);
                      setName(role.name);
                      setDescription(role.description || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium">{role.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Description</dt>
                  <dd className="font-medium">{role.description || '-'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-medium">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Permissions</dt>
                  <dd className="font-medium">{selectedPermissions.size} assigned</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Permissions</CardTitle>
              {hasPermissionChanges && (
                <Button onClick={handleSavePermissions} isLoading={setRolePermissions.isPending}>
                  <SaveIcon />
                  Save Changes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {permissionsLoading || rolePermissionsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : Object.keys(groupedPermissions).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([module, permissions]) => (
                  <div key={module}>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">
                      {module}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPermissions.has(permission.id)
                              ? 'border-primary-300 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.has(permission.id)}
                            onChange={() => handleTogglePermission(permission.id)}
                            className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {permission.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {permission.code}
                            </div>
                            {permission.description && (
                              <div className="text-xs text-gray-400 mt-1">
                                {permission.description}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No permissions available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
