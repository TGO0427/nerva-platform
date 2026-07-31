'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, ChevronDown, Check, Bell, BellOff, Building2, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/lib/queries';
import { useSites } from '@/lib/queries/settings';
import { GlobalSearch } from './global-search';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);
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
      const stored = localStorage.getItem('siteId');
      if (stored) {
        setCurrentSiteId(stored);
      } else if (sites && sites.length > 0) {
        const firstActive = sites.find(s => s.isActive) || sites[0];
        localStorage.setItem('siteId', firstActive.id);
        setCurrentSiteId(firstActive.id);
      }
    }
  }, [sites]);

  const currentSite = sites?.find(s => s.id === currentSiteId);

  const handleSiteChange = useCallback((siteId: string) => {
    localStorage.setItem('siteId', siteId);
    setCurrentSiteId(siteId);
    setIsSiteMenuOpen(false);
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
    <header className="h-16 bg-surface-card dark:bg-surface-dark-card border-b border-surface-border dark:border-surface-dark-border flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Menu button (mobile) */}
      <div className="flex items-center">
        <button
          type="button"
          className="lg:hidden p-2 -ml-2 text-text-muted hover:text-text-secondary dark:text-text-dark-muted dark:hover:text-text-dark-primary"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open menu</span>
          <Menu className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>

      {/* Right side - Search, Notifications and User menu */}
      <div className="flex items-center gap-3">
        {/* Global search */}
        <GlobalSearch />

        {/* Site selector */}
        {user && sites && sites.length > 0 && (
          <div className="relative hidden sm:block" ref={siteMenuRef}>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-secondary dark:border-surface-dark-border dark:hover:bg-surface-dark-secondary transition-colors"
              onClick={() => setIsSiteMenuOpen(!isSiteMenuOpen)}
            >
              <SiteIcon />
              <div className="text-left">
                <p className="text-xs text-text-muted dark:text-text-dark-muted leading-none">Site</p>
                <p className="text-sm font-medium text-text-secondary dark:text-text-dark-primary leading-tight">
                  {currentSite?.name || 'Select site'}
                </p>
              </div>
              <ChevronDown
                className={cn('h-3.5 w-3.5 text-text-muted dark:text-text-dark-muted transition-transform', isSiteMenuOpen && 'rotate-180')}
                strokeWidth={2}
              />
            </button>

            {isSiteMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-card dark:bg-surface-dark-card rounded-md shadow-lg border border-surface-border dark:border-surface-dark-border py-1 z-50">
                <div className="px-3 py-2 border-b border-surface-border dark:border-surface-dark-border">
                  <p className="text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Switch site</p>
                </div>
                {sites.filter(s => s.isActive).map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary flex items-center justify-between',
                      site.id === currentSiteId && 'bg-primary-50 text-primary-700'
                    )}
                    onClick={() => handleSiteChange(site.id)}
                  >
                    <div>
                      <p className="font-medium">{site.name}</p>
                      {site.code && <p className="text-xs text-text-muted dark:text-text-dark-muted">{site.code}</p>}
                    </div>
                    {site.id === currentSiteId && (
                      <Check className="h-4 w-4 text-primary-600" strokeWidth={2} />
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
            className="relative p-2 text-text-muted hover:text-text-secondary hover:bg-surface-secondary dark:text-text-dark-muted dark:hover:text-text-dark-primary dark:hover:bg-surface-dark-secondary rounded-md transition-colors"
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
            <div className="absolute right-0 mt-2 w-80 bg-surface-card dark:bg-surface-dark-card rounded-md shadow-lg border border-surface-border dark:border-surface-dark-border z-50">
              <div className="px-4 py-3 border-b border-surface-border dark:border-surface-dark-border flex items-center justify-between">
                <h3 className="font-medium text-text-primary dark:text-text-dark-primary">Notifications</h3>
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
                        'w-full px-4 py-3 text-left hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary border-b border-surface-border dark:border-surface-dark-border last:border-0',
                        !notification.isRead && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm', !notification.isRead && 'font-medium')}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-text-muted dark:text-text-dark-muted truncate">{notification.message}</p>
                          <p className="text-xs text-text-muted dark:text-text-dark-muted mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="h-2 w-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-text-muted dark:text-text-dark-muted">
                    <BellOffIcon />
                    <p className="mt-2 text-sm">No notifications</p>
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-surface-border dark:border-surface-dark-border">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 p-2 rounded-md hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {user?.displayName?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-text-secondary dark:text-text-dark-primary">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted truncate max-w-[120px]">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-text-muted dark:text-text-dark-muted" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="sm:hidden">
              <p className="font-medium normal-case tracking-normal text-text-secondary dark:text-text-dark-primary">{user?.displayName}</p>
              <p className="truncate text-xs normal-case tracking-normal">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  return <Bell className="h-6 w-6" strokeWidth={1.5} />;
}

function BellOffIcon() {
  return <BellOff className="h-12 w-12 mx-auto text-text-muted dark:text-text-dark-muted" strokeWidth={1} />;
}

function SiteIcon() {
  return <Building2 className="h-4 w-4 text-text-muted dark:text-text-dark-muted" strokeWidth={1.5} />;
}

const notificationIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  SUCCESS: { icon: CheckCircle2, color: 'text-success' },
  WARNING: { icon: AlertTriangle, color: 'text-warning' },
  ERROR: { icon: XCircle, color: 'text-danger' },
  INFO: { icon: Info, color: 'text-info' },
};

function NotificationIcon({ type }: { type: string }) {
  const config = notificationIcons[type];
  const Icon = config?.icon;
  const color = config?.color || 'text-text-muted dark:text-text-dark-muted';

  return (
    <div className={`h-8 w-8 rounded-full bg-surface-secondary dark:bg-surface-dark-secondary flex items-center justify-center ${color}`}>
      {Icon && <Icon className="h-4 w-4" strokeWidth={2} />}
    </div>
  );
}
