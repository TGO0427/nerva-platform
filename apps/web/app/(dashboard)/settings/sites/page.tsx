'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useSites, useCreateSite, useUpdateSite, Site } from '@/lib/queries';

export default function SitesPage() {
  const { data: sites, isLoading } = useSites();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteCode, setNewSiteCode] = useState('');
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSite.mutateAsync({
        name: newSiteName,
        code: newSiteCode || undefined,
      });
      setShowCreateForm(false);
      setNewSiteName('');
      setNewSiteCode('');
    } catch (error) {
      console.error('Failed to create site:', error);
    }
  };

  const handleStartEdit = (site: Site) => {
    setEditingSite(site);
    setEditName(site.name);
    setEditCode(site.code);
  };

  const handleSaveEdit = async () => {
    if (!editingSite) return;
    try {
      await updateSite.mutateAsync({
        id: editingSite.id,
        data: {
          name: editName,
          code: editCode,
        },
      });
      setEditingSite(null);
    } catch (error) {
      console.error('Failed to update site:', error);
    }
  };

  const handleToggleSiteActive = async (site: Site) => {
    const action = site.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} the site "${site.name}"?`)) {
      try {
        await updateSite.mutateAsync({
          id: site.id,
          data: { isActive: !site.isActive },
        });
      } catch (error) {
        console.error('Failed to toggle site status:', error);
      }
    }
  };

  const activeSites = sites?.filter(s => s.isActive).length || 0;
  const inactiveSites = sites?.filter(s => !s.isActive).length || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-500 mt-1">Manage warehouse sites and locations</p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <PlusIcon />
            New Site
          </Button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{sites?.length || 0}</div>
            <p className="text-sm text-gray-500">Total Sites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeSites}</div>
            <p className="text-sm text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{inactiveSites}</div>
            <p className="text-sm text-gray-500">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Site Form */}
      {showCreateForm && (
        <Card className="mb-6 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Create New Site</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Name *
                  </label>
                  <Input
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    placeholder="e.g., Main Warehouse"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Code
                  </label>
                  <Input
                    value={newSiteCode}
                    onChange={(e) => setNewSiteCode(e.target.value.toUpperCase())}
                    placeholder="e.g., MAIN"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={createSite.isPending}>
                  Create Site
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewSiteName('');
                    setNewSiteCode('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sites List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : sites && sites.length > 0 ? (
        <div className="space-y-4">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardContent className="py-4">
                {editingSite?.id === site.id ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="sm:w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code
                      </label>
                      <Input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                        maxLength={10}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={handleSaveEdit} isLoading={updateSite.isPending}>
                        Save
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingSite(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <BuildingIcon />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{site.name}</h3>
                          <Badge variant={site.isActive ? 'success' : 'danger'}>
                            {site.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Code: {site.code} | Created {new Date(site.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStartEdit(site)}
                      >
                        <EditIcon />
                        Edit
                      </Button>
                      <Button
                        variant={site.isActive ? 'danger' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleSiteActive(site)}
                        isLoading={updateSite.isPending}
                      >
                        {site.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BuildingIconLarge />
            <h3 className="mt-4 font-medium text-gray-900">No sites found</h3>
            <p className="text-sm text-gray-500 mt-1">Create a site to manage warehouse locations</p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              Create Site
            </Button>
          </CardContent>
        </Card>
      )}
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

function EditIcon() {
  return (
    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function BuildingIconLarge() {
  return (
    <svg className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}
