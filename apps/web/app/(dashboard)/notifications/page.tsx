'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  type Notification,
} from '@/lib/queries';

export default function NotificationsPage() {
  const router = useRouter();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useNotifications({ page, limit: 20, unreadOnly: showUnreadOnly });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated on important events and alerts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {data.data.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors',
                    !notification.isRead && 'bg-blue-50'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <NotificationIcon type={notification.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={cn('text-sm', !notification.isRead && 'font-semibold')}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDateTime(notification.createdAt)}
                            </span>
                            <CategoryBadge category={notification.category} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full" />
                          )}
                          <button
                            type="button"
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            onClick={(e) => handleDelete(e, notification.id)}
                            title="Delete notification"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BellOffIcon />
              <p className="mt-2">
                {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.meta && (data.meta.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Page {page} of {data.meta.totalPages ?? 1} ({data.meta.total ?? 0} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (data.meta.totalPages || 1)}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    SALES: 'bg-blue-100 text-blue-700',
    INVENTORY: 'bg-green-100 text-green-700',
    PROCUREMENT: 'bg-purple-100 text-purple-700',
    SYSTEM: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={cn('px-2 py-0.5 text-xs rounded-full', colors[category] || colors.SYSTEM)}>
      {category}
    </span>
  );
}

function NotificationIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    INFO: 'bg-blue-100 text-blue-600',
    WARNING: 'bg-yellow-100 text-yellow-600',
    ERROR: 'bg-red-100 text-red-600',
    SUCCESS: 'bg-green-100 text-green-600',
  };
  const colorClass = colors[type] || colors.INFO;

  return (
    <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', colorClass)}>
      {type === 'SUCCESS' && (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {type === 'WARNING' && (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      {type === 'ERROR' && (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {type === 'INFO' && (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function BellOffIcon() {
  return (
    <svg className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.714.318 23.997 23.997 0 003.143-.318m-6.857 0a23.998 23.998 0 01-3.643-.987c.166-.23.323-.469.47-.716A8.986 8.986 0 004 9.75V9A6 6 0 0116 9v.75c0 1.89.577 3.64 1.562 5.086m-10.419 2.246a3 3 0 005.714 0M3 3l18 18" />
    </svg>
  );
}
