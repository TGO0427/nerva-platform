'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useCustomerPortal } from '@/lib/contexts/customer-portal-context';
import { useCustomerActivity } from '@/lib/queries/customers';
import type { AuditEntryWithActor } from '@/lib/queries/audit';

export default function CustomerPortalActivity() {
  const params = useParams();
  const customerId = params.customerId as string;
  const { customer } = useCustomerPortal();

  const { data: activity, isLoading } = useCustomerActivity(customerId);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'Created';
      case 'UPDATE':
        return 'Updated';
      case 'DELETE':
        return 'Deleted';
      default:
        return action;
    }
  };

  const getActionVariant = (action: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'info';
      case 'DELETE':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
        <p className="text-gray-500 mt-1">
          Activity history for {customer?.name}
        </p>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !activity || activity.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ActivityIcon className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p className="font-medium">No activity yet</p>
              <p className="text-sm mt-1">Activity will be recorded here</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {activity.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      entry.action === 'CREATE' ? 'bg-green-100' :
                      entry.action === 'UPDATE' ? 'bg-blue-100' :
                      entry.action === 'DELETE' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {entry.action === 'CREATE' && <PlusIcon className="w-4 h-4 text-green-600" />}
                      {entry.action === 'UPDATE' && <EditIcon className="w-4 h-4 text-blue-600" />}
                      {entry.action === 'DELETE' && <TrashIcon className="w-4 h-4 text-red-600" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionVariant(entry.action)}>
                          {getActionLabel(entry.action)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {entry.entityType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">
                        {entry.actorName || 'System'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>

                      {/* Show changes for updates */}
                      {entry.action === 'UPDATE' && entry.beforeJson && entry.afterJson && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs">
                          <div className="font-medium text-gray-700 mb-2">Changes:</div>
                          <div className="space-y-1">
                            {Object.keys(entry.afterJson).map((key) => {
                              const before = entry.beforeJson?.[key];
                              const after = entry.afterJson?.[key];
                              if (before !== after) {
                                return (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-gray-500">{key}:</span>
                                    <span className="text-red-600 line-through">{String(before || '-')}</span>
                                    <span className="text-gray-400">&rarr;</span>
                                    <span className="text-green-600">{String(after || '-')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
