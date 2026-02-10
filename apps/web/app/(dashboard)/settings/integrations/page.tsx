'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  usePostingQueue,
  useRetryPosting,
} from '@/lib/queries/integrations';
import type { IntegrationConnection } from '@nerva/shared';

const INTEGRATION_TYPES = [
  { value: 'xero', label: 'Xero' },
  { value: 'sage', label: 'Sage' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'evolution', label: 'Evolution' },
  { value: 'sap_b1', label: 'SAP Business One' },
  { value: 'custom_api', label: 'Custom API' },
] as const;

const QUEUE_STATUSES = ['', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING'] as const;

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'connections' | 'queue'>('connections');

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-1">Manage third-party connections and document posting</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('connections')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'connections'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Connections
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'queue'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Posting Queue
          </button>
        </nav>
      </div>

      {activeTab === 'connections' ? <ConnectionsTab /> : <PostingQueueTab />}
    </div>
  );
}

// === CONNECTIONS TAB ===
function ConnectionsTab() {
  const { data: connections, isLoading } = useIntegrations();
  const connectIntegration = useConnectIntegration();
  const disconnectIntegration = useDisconnectIntegration();

  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState('');
  const [newName, setNewName] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await connectIntegration.mutateAsync({ type: newType, name: newName });
      setShowForm(false);
      setNewType('');
      setNewName('');
    } catch (error) {
      console.error('Failed to connect integration:', error);
    }
  };

  const handleDisconnect = async (connection: IntegrationConnection) => {
    if (confirm(`Are you sure you want to disconnect "${connection.name}"?`)) {
      try {
        await disconnectIntegration.mutateAsync(connection.id);
      } catch (error) {
        console.error('Failed to disconnect integration:', error);
      }
    }
  };

  const connectedCount = connections?.filter(c => c.status === 'CONNECTED').length || 0;
  const errorCount = connections?.filter(c => c.status === 'ERROR').length || 0;

  const statusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
      CONNECTED: 'success',
      DISCONNECTED: 'default',
      ERROR: 'danger',
      PENDING_AUTH: 'warning',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const typeLabel = (type: string) => {
    const found = INTEGRATION_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <>
      {/* Stats + Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">{connections?.length || 0}</div>
              <p className="text-sm text-slate-500">Total Connections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{connectedCount}</div>
              <p className="text-sm text-slate-500">Connected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <p className="text-sm text-slate-500">Errors</p>
            </CardContent>
          </Card>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            <PlusIcon />
            Add Connection
          </Button>
        )}
      </div>

      {/* Add Connection Form */}
      {showForm && (
        <Card className="mb-6 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Add Integration Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Integration Type *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select type...</option>
                    {INTEGRATION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Connection Name *
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Production Xero"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={connectIntegration.isPending}>
                  Create Connection
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setNewType('');
                    setNewName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Connections List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : connections && connections.length > 0 ? (
        <div className="space-y-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <IntegrationIcon type={connection.type} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">{connection.name}</h3>
                        {statusBadge(connection.status)}
                      </div>
                      <p className="text-sm text-slate-500">
                        {typeLabel(connection.type)}
                        {connection.lastSyncAt && (
                          <> | Last sync: {new Date(connection.lastSyncAt).toLocaleString()}</>
                        )}
                      </p>
                      {connection.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">{connection.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {connection.status === 'CONNECTED' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDisconnect(connection)}
                        isLoading={disconnectIntegration.isPending}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <LinkIconLarge />
            <h3 className="mt-4 font-medium text-slate-900">No integrations configured</h3>
            <p className="text-sm text-slate-500 mt-1">
              Connect to accounting and ERP systems to sync data automatically
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              Add Connection
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// === POSTING QUEUE TAB ===
function PostingQueueTab() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const { data: queue, isLoading } = usePostingQueue({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });
  const retryPosting = useRetryPosting();

  const handleRetry = async (id: string) => {
    try {
      await retryPosting.mutateAsync(id);
    } catch (error) {
      console.error('Failed to retry posting:', error);
    }
  };

  const queueStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
      PENDING: 'default',
      PROCESSING: 'warning',
      SUCCESS: 'success',
      FAILED: 'danger',
      RETRYING: 'warning',
      CANCELLED: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const docTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: 'Invoice',
      credit_note: 'Credit Note',
      stock_journal: 'Stock Journal',
      customer: 'Customer',
      supplier: 'Supplier',
    };
    return labels[type] || type;
  };

  return (
    <>
      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {QUEUE_STATUSES.map(status => (
          <button
            key={status || 'all'}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              statusFilter === status
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : queue?.data && queue.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Document
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                        Attempts
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        External Ref
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Error
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {queue.data.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {docTypeLabel(item.docType)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {queueStatusBadge(item.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                          {item.attempts}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {item.externalRef || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-500 max-w-xs truncate">
                          {item.lastError || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {item.status === 'FAILED' && (
                            <Button
                              size="sm"
                              onClick={() => handleRetry(item.id)}
                              isLoading={retryPosting.isPending}
                            >
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-slate-500">
                  Page {page}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!queue.data || queue.data.length < 20}
                    className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <QueueIcon />
              <h3 className="mt-4 font-medium text-slate-900">No items in queue</h3>
              <p className="text-sm text-slate-500 mt-1">
                {statusFilter
                  ? `No ${statusFilter.toLowerCase()} items found`
                  : 'Documents will appear here when posted to integrations'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// === ICONS ===
function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IntegrationIcon({ type }: { type: string }) {
  // Generic integration icon — could be extended per type
  return (
    <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function LinkIconLarge() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}
