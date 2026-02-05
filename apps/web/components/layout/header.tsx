'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/lib/queries';
import { useSites } from '@/lib/queries/settings';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const siteMenuRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notificationsData } = useNotifications({ limit: 5 });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const { data: sites } = useSites();
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentSiteId(localStorage.getItem('siteId'));
    }
  }, []);

  const currentSite = sites?.find(s => s.id === currentSiteId);

  const handleSiteChange = useCallback((siteId: string) => {
    localStorage.setItem('siteId', siteId);
    setCurrentSiteId(siteId);
    setIsSiteMenuOpen(false);
    window.location.reload();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (siteMenuRef.current && !siteMenuRef.current.contains(event.target as Node)) {
        setIsSiteMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleNotificationClick = (notification: { id: string; isRead: boolean; link: string | null }) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    setIsNotificationsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Menu button (mobile) */}
      <div className="flex items-center">
        <button
          type="button"
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open menu</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right side - Notifications and User menu */}
      <div className="flex items-center gap-4">
        {/* Site selector */}
        {user && sites && sites.length > 0 && (
          <div className="relative hidden sm:block" ref={siteMenuRef}>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={() => setIsSiteMenuOpen(!isSiteMenuOpen)}
            >
              <SiteIcon />
              <div className="text-left">
                <p className="text-xs text-gray-500 leading-none">Site</p>
                <p className="text-sm font-medium text-gray-700 leading-tight">
                  {currentSite?.name || 'Select site'}
                </p>
              </div>
              <svg
                className={cn('h-3.5 w-3.5 text-gray-400 transition-transform', isSiteMenuOpen && 'rotate-180')}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isSiteMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Switch site</p>
                </div>
                {sites.filter(s => s.isActive).map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between',
                      site.id === currentSiteId && 'bg-primary-50 text-primary-700'
                    )}
                    onClick={() => handleSiteChange(site.id)}
                  >
                    <div>
                      <p className="font-medium">{site.name}</p>
                      {site.code && <p className="text-xs text-gray-500">{site.code}</p>}
                    </div>
                    {site.id === currentSiteId && (
                      <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          >
            <span className="sr-only">View notifications</span>
            <BellIcon />
            {unreadCount && unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Notifications</h3>
                {unreadCount && unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-sm text-primary-600 hover:underline"
                    onClick={handleMarkAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationsData?.data && notificationsData.data.length > 0 ? (
                  notificationsData.data.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0',
                        !notification.isRead && 'bg-blue-50'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm', !notification.isRead && 'font-medium')}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <BellOffIcon />
                    <p className="mt-2 text-sm">No notifications</p>
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <Link
                  href="/notifications"
                  className="text-sm text-primary-600 hover:underline"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.displayName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-700">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[120px]">
                {user?.email}
              </p>
            </div>
            <svg
              className={cn(
                'h-4 w-4 text-gray-500 transition-transform',
                isUserMenuOpen && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                <p className="text-sm font-medium text-gray-700">{user?.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  router.push('/settings/profile');
                }}
              >
                Profile Settings
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function BellIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function BellOffIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.714.318 23.997 23.997 0 003.143-.318m-6.857 0a23.998 23.998 0 01-3.643-.987c.166-.23.323-.469.47-.716A8.986 8.986 0 004 9.75V9A6 6 0 0116 9v.75c0 1.89.577 3.64 1.562 5.086m-10.419 2.246a3 3 0 005.714 0M3 3l18 18" />
    </svg>
  );
}

function SiteIcon() {
  return (
    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function NotificationIcon({ type }: { type: string }) {
  const colors = {
    INFO: 'text-blue-500',
    WARNING: 'text-yellow-500',
    ERROR: 'text-red-500',
    SUCCESS: 'text-green-500',
  };
  const color = colors[type as keyof typeof colors] || 'text-gray-500';

  return (
    <div className={`h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ${color}`}>
      {type === 'SUCCESS' && (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {type === 'WARNING' && (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      {type === 'ERROR' && (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {type === 'INFO' && (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </div>
  );
}
