'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth, hasPermission } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { KpiCard } from '@/components/ui/kpi-card';
import { AnimatedNumber, AnimatedCurrency } from '@/components/ui/animated-number';
import { useDashboardStats, useRecentActivity } from '@/lib/queries';
import { PERMISSIONS } from '@nerva/shared';

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
}

function QuickAction({ title, description, href, icon, primary }: QuickActionProps) {
  if (primary) {
    return (
      <Link href={href}>
        <motion.div
          className="flex items-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl text-white shadow-md hover:shadow-lg"
          whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(59,130,246,0.3)' }}
          transition={{ type: 'spring', stiffness: 550, damping: 35 }}
        >
          <div className="h-11 w-11 bg-white/20 rounded-xl flex items-center justify-center mr-4">
            {icon}
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-blue-100">{description}</p>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <motion.div
        className="flex items-center p-4 bg-white rounded-2xl border border-slate-200/70 hover:border-slate-300 transition-all"
        whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
        transition={{ type: 'spring', stiffness: 550, damping: 35 }}
      >
        <div className="h-11 w-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 mr-4">
          {icon}
        </div>
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity(8);

  const quickActions = [
    {
      title: 'Create Sales Order',
      description: 'Start a new customer order',
      href: '/sales/new',
      icon: <PlusIcon />,
      permission: PERMISSIONS.SALES_ORDER_CREATE,
      primary: true,
    },
    {
      title: 'View Fulfilment',
      description: 'Manage pick waves and tasks',
      href: '/fulfilment',
      icon: <BoxIcon />,
      permission: PERMISSIONS.PICK_WAVE_CREATE,
    },
    {
      title: 'Create Purchase Order',
      description: 'Order from suppliers',
      href: '/procurement/purchase-orders/new',
      icon: <ShoppingCartIcon />,
      permission: PERMISSIONS.PURCHASE_ORDER_WRITE,
    },
    {
      title: 'View Inventory',
      description: 'Check stock levels',
      href: '/inventory',
      icon: <InventoryIcon />,
      permission: PERMISSIONS.INVENTORY_READ,
    },
  ].filter(action => hasPermission(user, action.permission));

  // Determine tones based on values
  const pendingOrdersTone = (stats?.pendingOrders ?? 0) > 0 ? 'blue' : 'neutral';
  const readyToPickTone = (stats?.activePickWaves ?? 0) > 0 ? 'blue' : 'neutral';
  const openReturnsTone = (stats?.openReturns ?? 0) > 0 ? 'amber' : 'neutral';
  const stockAlertsTone = ((stats?.lowStockItems ?? 0) + (stats?.expiringItems ?? 0)) > 0 ? 'red' : 'green';
  const lateOrdersTone = (stats?.lateOrders ?? 0) > 0 ? 'red' : 'green';
  const openNCRsTone = (stats?.openNCRs ?? 0) > 0 ? 'amber' : 'neutral';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Brand Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" />

      <div className="p-6">
        <Breadcrumbs />

        <div className="mb-6">
          <p className="text-sm text-slate-500">
            Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Operations Overview
          </h1>
        </div>

        {/* KPI Cards */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <KpiCard
                  title="Pending Orders"
                  value={<AnimatedNumber value={stats?.pendingOrders ?? 0} duration={400} />}
                  sub={stats?.allocatedOrders ? `${stats.allocatedOrders} allocated` : (stats?.pendingOrders ?? 0) === 0 ? 'Create an order to start' : undefined}
                  icon={<ClipboardIcon />}
                  href="/sales"
                  tone={pendingOrdersTone as 'blue' | 'neutral'}
                />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <KpiCard
                  title="Ready to Pick"
                  value={<AnimatedNumber value={stats?.activePickWaves ?? 0} duration={400} />}
                  sub={stats?.pendingPickTasks ? `${stats.pendingPickTasks} pick tasks` : (stats?.activePickWaves ?? 0) === 0 ? 'Create a pick wave' : undefined}
                  icon={<BoxIcon />}
                  href="/fulfilment?tab=allocated-orders"
                  tone={readyToPickTone as 'blue' | 'neutral'}
                />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <KpiCard
                  title="Open Returns"
                  value={<AnimatedNumber value={stats?.openReturns ?? 0} duration={400} />}
                  sub={(stats?.openReturns ?? 0) > 0 ? 'Awaiting processing' : 'No returns to process'}
                  icon={<RefreshIcon />}
                  href="/returns"
                  tone={openReturnsTone as 'amber' | 'neutral'}
                />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <KpiCard
                  title="Stock Alerts"
                  value={<AnimatedNumber value={(stats?.lowStockItems ?? 0) + (stats?.expiringItems ?? 0)} duration={400} />}
                  sub={stats?.lowStockItems ? `${stats.lowStockItems} low stock` : 'All stock levels healthy'}
                  icon={<AlertIcon />}
                  href="/inventory/expiry-alerts"
                  tone={stockAlertsTone as 'red' | 'green'}
                />
              </motion.div>
            </motion.div>

            {/* Today's Ops */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-700 tracking-tight uppercase mb-3">Today&apos;s Ops</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  title="Trips in Progress"
                  value={<AnimatedNumber value={stats?.tripsInProgress ?? 0} duration={400} />}
                  sub={stats?.tripsCompletedToday ? `${stats.tripsCompletedToday} completed today` : 'No trips completed yet'}
                  icon={<TruckIcon />}
                  href="/dispatch"
                  tone={(stats?.tripsInProgress ?? 0) > 0 ? 'blue' : 'neutral'}
                />
                <KpiCard
                  title="Open NCRs"
                  value={<AnimatedNumber value={stats?.openNCRs ?? 0} duration={400} />}
                  sub={(stats?.openNCRs ?? 0) > 0 ? 'Requires attention' : 'All clear'}
                  icon={<WarningIcon />}
                  href="/returns"
                  tone={openNCRsTone as 'amber' | 'neutral'}
                />
                <KpiCard
                  title="Late Orders"
                  value={<AnimatedNumber value={stats?.lateOrders ?? 0} duration={400} />}
                  sub={(stats?.lateOrders ?? 0) > 0 ? 'Past requested ship date' : 'All orders on track'}
                  icon={<ClockIcon />}
                  href="/sales?late=true"
                  tone={lateOrdersTone as 'red' | 'green'}
                />
              </div>
            </div>

            {/* Weekly Summary */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-700 tracking-tight uppercase mb-3">Weekly Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  title="Weekly Sales"
                  value={<AnimatedCurrency value={stats?.weeklySalesValue ?? 0} duration={500} />}
                  sub="Last 7 days"
                  icon={<CurrencyIcon />}
                  tone="green"
                  sparkline={[4, 7, 5, 9, 6, 8, 10]}
                />
                <KpiCard
                  title="Weekly Orders"
                  value={<AnimatedNumber value={stats?.weeklyOrdersCount ?? 0} duration={400} />}
                  sub="Last 7 days"
                  icon={<TrendingIcon />}
                  tone="blue"
                  sparkline={[3, 5, 4, 7, 6, 8, 9]}
                />
                <KpiCard
                  title="Shipped This Week"
                  value={<AnimatedNumber value={stats?.shippedOrders ?? 0} duration={400} />}
                  sub="Completed shipments"
                  icon={<ShipIcon />}
                  tone="green"
                />
              </div>
            </div>

            {/* Operational KPIs */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-700 tracking-tight uppercase mb-3">Performance Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title="OTIF %"
                  value={<><AnimatedNumber value={stats?.otifPercent ?? 0} duration={400} />%</>}
                  sub="On-time in-full delivery"
                  icon={<TargetIcon />}
                  tone={(stats?.otifPercent ?? 0) >= 95 ? 'green' : (stats?.otifPercent ?? 0) >= 80 ? 'blue' : 'amber'}
                />
                <KpiCard
                  title="POD Rate"
                  value={<><AnimatedNumber value={stats?.podCompletionPercent ?? 0} duration={400} />%</>}
                  sub="Proof of delivery captured"
                  icon={<CheckCircleIcon />}
                  tone={(stats?.podCompletionPercent ?? 0) >= 95 ? 'green' : (stats?.podCompletionPercent ?? 0) >= 80 ? 'blue' : 'amber'}
                />
                <KpiCard
                  title="Returns Rate"
                  value={<><AnimatedNumber value={stats?.returnsRate ?? 0} duration={400} decimals={1} />%</>}
                  sub="Weekly return value ratio"
                  icon={<ReturnIcon />}
                  tone={(stats?.returnsRate ?? 0) <= 2 ? 'green' : (stats?.returnsRate ?? 0) <= 5 ? 'amber' : 'red'}
                />
                <KpiCard
                  title="Dispatch Cycle"
                  value={<><AnimatedNumber value={stats?.avgDispatchCycleHours ?? 0} duration={400} decimals={1} />h</>}
                  sub="Avg trip duration (30d)"
                  icon={<CycleIcon />}
                  tone={(stats?.avgDispatchCycleHours ?? 0) <= 8 ? 'green' : (stats?.avgDispatchCycleHours ?? 0) <= 24 ? 'blue' : 'amber'}
                />
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <QuickAction key={action.title} {...action} />
                  ))}
                </div>
                {quickActions.length === 0 && (
                  <p className="text-slate-500 text-center py-4">
                    No actions available with your current permissions.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
              </div>
              <div className="p-5">
                {activityLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : activity && activity.length > 0 ? (
                  <motion.div
                    className="space-y-4"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                    }}
                  >
                    {activity.map((item) => (
                      <motion.div
                        key={`${item.type}-${item.id}`}
                        className="flex items-start"
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          show: { opacity: 1, x: 0, transition: { duration: 0.15 } }
                        }}
                      >
                        <ActivityIcon type={item.type} />
                        <div className="flex-1 min-w-0 ml-3">
                          <p className="text-sm text-slate-900">{item.message}</p>
                          <p className="text-xs text-slate-500">{getTimeAgo(item.createdAt)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-6">
                    <div className="h-11 w-11 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                      <ActivityEmptyIcon />
                    </div>
                    <p className="text-slate-500 mt-3 text-sm">No recent activity</p>
                    <p className="text-slate-400 text-xs mt-1">Activity will appear as you create orders and process stock.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    sales_order: 'bg-blue-500',
    purchase_order: 'bg-purple-500',
    grn: 'bg-emerald-500',
    pick_wave: 'bg-amber-500',
    shipment: 'bg-teal-500',
  };
  return (
    <div className={`h-2 w-2 mt-2 rounded-full ${colors[type] || 'bg-slate-400'} flex-shrink-0`} />
  );
}

// Icons
function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ShoppingCartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3a2.25 2.25 0 00-2.25-2.25h-1.5v-3.75a.75.75 0 00-.75-.75H9.75a.75.75 0 00-.75.75v7.5H3.375c-.621 0-1.125.504-1.125 1.125v.75M8.25 18.75h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function ActivityEmptyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Operational KPI Icons
function TargetIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.01" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

function CycleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
    </svg>
  );
}
