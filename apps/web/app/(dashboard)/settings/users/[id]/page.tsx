'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useUser,
  useUpdateUser,
  useUserRoles,
  useRoles,
  useAssignUserRole,
} from '@/lib/queries';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { data: user, isLoading: userLoading } = useUser(userId);
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles(userId);
  const { data: allRoles } = useRoles();
  const updateUser = useUpdateUser();
  const assignRole = useAssignUserRole();

  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form when user data loads
  useEffect(() => {
    if (user && !isEditing) {
      setDisplayName(user.displayName || '');
    }
  }, [user, isEditing]);

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({
        id: userId,
        data: { displayName },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    const action = user.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        await updateUser.mutateAsync({
          id: userId,
          data: { isActive: !user.isActive },
        });
      } catch (error) {
        console.error('Failed to toggle user status:', error);
      }
    }
  };

  const handleAssignRole = async (roleId: string) => {
    try {
      await assignRole.mutateAsync({ userId, roleId });
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">User not found</h2>
        <Button className="mt-4" onClick={() => router.push('/settings/users')}>
          Back to Users
        </Button>
      </div>
    );
  }

  const assignedRoleIds = userRoles?.map(r => r.id) || [];
  const availableRoles = allRoles?.filter(r => !assignedRoleIds.includes(r.id)) || [];

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{user.email}</h1>
            <Badge variant={user.isActive ? 'success' : 'danger'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Created {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={user.isActive ? 'danger' : 'primary'}
            onClick={handleToggleActive}
            isLoading={updateUser.isPending}
          >
            {user.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Details</CardTitle>
              {!isEditing && (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  <EditIcon />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Display Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} isLoading={updateUser.isPending}>
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(user.displayName || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium">{user.displayName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">User Type</dt>
                  <dd className="font-medium capitalize">{user.userType}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Login</dt>
                  <dd className="font-medium">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd className="font-medium">{new Date(user.updatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* User Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {rolesLoading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : (
              <>
                {userRoles && userRoles.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {userRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{role.name}</div>
                          {role.description && (
                            <div className="text-sm text-slate-500">{role.description}</div>
                          )}
                        </div>
                        <Badge variant="info">Assigned</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-4">No roles assigned</p>
                )}

                {availableRoles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Add Role</h4>
                    <div className="flex flex-wrap gap-2">
                      {availableRoles.map((role) => (
                        <Button
                          key={role.id}
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAssignRole(role.id)}
                          isLoading={assignRole.isPending}
                        >
                          <PlusIcon />
                          {role.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
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

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
