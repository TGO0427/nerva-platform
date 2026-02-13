'use client';

import { useState, useEffect, useMemo } from 'react';
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

// Map permission code prefixes to friendly module names
const MODULE_LABELS: Record<string, string> = {
  order: 'Sales Orders',
  customer: 'Customers',
  supplier: 'Suppliers',
  item: 'Items',
  inventory: 'Inventory',
  warehouse: 'Warehouses',
  purchase_order: 'Purchase Orders',
  invoice: 'Invoices',
  credit: 'Credit Notes',
  rma: 'Returns (RMA)',
  pick_wave: 'Pick Waves',
  pick_task: 'Pick Tasks',
  shipment: 'Shipments',
  dispatch: 'Dispatch',
  cycle_count: 'Cycle Counts',
  putaway: 'Putaway',
  ibt: 'Inter-Branch Transfers',
  bom: 'Bills of Materials',
  work_order: 'Work Orders',
  routing: 'Routings',
  workstation: 'Workstations',
  production: 'Production',
  user: 'Users',
  tenant: 'Tenant / Company',
  site: 'Sites',
  audit: 'Audit Log',
  integration: 'Integrations',
  system: 'System',
  portal: 'Customer Portal',
  driver: 'Driver App',
};

// Map action keywords to friendly category names + sort order
const ACTION_CATEGORIES: Record<string, { label: string; order: number }> = {
  read: { label: 'View', order: 1 },
  view: { label: 'View', order: 1 },
  create: { label: 'Create', order: 2 },
  write: { label: 'Edit', order: 3 },
  edit: { label: 'Edit', order: 3 },
  execute: { label: 'Execute', order: 4 },
  start: { label: 'Execute', order: 4 },
  complete: { label: 'Execute', order: 4 },
  capture: { label: 'Execute', order: 4 },
  update: { label: 'Edit', order: 3 },
  approve: { label: 'Approve', order: 5 },
  delete: { label: 'Delete', order: 6 },
  manage: { label: 'Manage', order: 7 },
  assign: { label: 'Manage', order: 7 },
  plan: { label: 'Manage', order: 7 },
  receive: { label: 'Execute', order: 4 },
  download: { label: 'View', order: 1 },
  upload: { label: 'Create', order: 2 },
};

function getModuleFromCode(code: string): string {
  // Handle multi-part prefixes like "pick_wave", "pick_task", "purchase_order", etc.
  const parts = code.split('.');
  if (parts.length < 2) return code;
  const action = parts[parts.length - 1];
  const moduleParts = parts.slice(0, -1);
  return moduleParts.join('_');
}

function getActionFromCode(code: string): string {
  const parts = code.split('.');
  return parts[parts.length - 1] || '';
}

function getActionCategory(action: string): { label: string; order: number } {
  return ACTION_CATEGORIES[action] || { label: 'Other', order: 99 };
}

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
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
    }
  }, [role]);

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

  const handleToggleCategory = (permissions: Permission[], allChecked: boolean) => {
    const newSelected = new Set(selectedPermissions);
    for (const p of permissions) {
      if (allChecked) {
        newSelected.delete(p.id);
      } else {
        newSelected.add(p.id);
      }
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

  // Group permissions by module, then by action category
  const groupedPermissions = useMemo(() => {
    const perms = allPermissions || [];
    const filtered = search
      ? perms.filter(p =>
          p.code.toLowerCase().includes(search.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
          (p.name || '').toLowerCase().includes(search.toLowerCase())
        )
      : perms;

    const modules: Record<string, Record<string, Permission[]>> = {};

    for (const p of filtered) {
      const moduleKey = getModuleFromCode(p.code);
      const action = getActionFromCode(p.code);
      const category = getActionCategory(action);

      if (!modules[moduleKey]) modules[moduleKey] = {};
      if (!modules[moduleKey][category.label]) modules[moduleKey][category.label] = [];
      modules[moduleKey][category.label].push(p);
    }

    // Sort modules alphabetically, sort categories by order
    const sorted = Object.entries(modules)
      .sort(([a], [b]) => (MODULE_LABELS[a] || a).localeCompare(MODULE_LABELS[b] || b))
      .map(([moduleKey, categories]) => ({
        moduleKey,
        label: MODULE_LABELS[moduleKey] || moduleKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        categories: Object.entries(categories)
          .sort(([a], [b]) => {
            const orderA = Object.values(ACTION_CATEGORIES).find(c => c.label === a)?.order || 99;
            const orderB = Object.values(ACTION_CATEGORIES).find(c => c.label === b)?.order || 99;
            return orderA - orderB;
          })
          .map(([catLabel, perms]) => ({ label: catLabel, permissions: perms })),
      }));

    return sorted;
  }, [allPermissions, search]);

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
        <h2 className="text-lg font-medium text-slate-900">Role not found</h2>
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
          <h1 className="text-2xl font-bold text-slate-900">{role.name}</h1>
          <p className="text-slate-500 mt-1">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium">{role.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd className="font-medium">{role.description || '-'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="font-medium">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Permissions</dt>
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
            <div className="mt-3">
              <div className="relative">
                <SearchIcon />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search permissions..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {permissionsLoading || rolePermissionsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : groupedPermissions.length > 0 ? (
              <div className="space-y-6">
                {groupedPermissions.map((module) => (
                  <div key={module.moduleKey} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-800">
                        {module.label}
                      </h4>
                    </div>
                    <div className="p-4 space-y-4">
                      {module.categories.map((cat) => {
                        const allChecked = cat.permissions.every(p => selectedPermissions.has(p.id));
                        const someChecked = cat.permissions.some(p => selectedPermissions.has(p.id));
                        return (
                          <div key={cat.label}>
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                onChange={() => handleToggleCategory(cat.permissions, allChecked)}
                                className="h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {cat.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-6">
                              {cat.permissions.map((permission) => (
                                <label
                                  key={permission.id}
                                  className={`flex items-center gap-2.5 px-3 py-2 border rounded-md cursor-pointer transition-colors text-sm ${
                                    selectedPermissions.has(permission.id)
                                      ? 'border-primary-300 bg-primary-50 text-primary-800'
                                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.has(permission.id)}
                                    onChange={() => handleTogglePermission(permission.id)}
                                    className="h-3.5 w-3.5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">
                                      {permission.description || permission.code}
                                    </div>
                                    <div className="text-xs text-slate-400">{permission.code}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                {search ? 'No permissions match your search' : 'No permissions available'}
              </p>
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

function SearchIcon() {
  return (
    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}
