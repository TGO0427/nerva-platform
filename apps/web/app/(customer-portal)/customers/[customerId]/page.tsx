'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { KpiCard } from '@/components/ui/kpi-card';
import { useCustomerPortal } from '@/lib/contexts/customer-portal-context';
import { useOrders } from '@/lib/queries/sales';

export default function CustomerPortalDashboard() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const { customer, isLoading: customerLoading } = useCustomerPortal();

  // Fetch customer's orders for stats
  const { data: ordersData, isLoading: ordersLoading } = useOrders({
    page: 1,
    limit: 100,
    customerId,
  });

  const orders = ordersData?.data || [];
  const isLoading = customerLoading || ordersLoading;

  // Calculate stats from orders
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o =>
    ['DRAFT', 'CONFIRMED', 'ALLOCATED', 'PICKING', 'PACKING'].includes(o.status)
  ).length;
  const completedOrders = orders.filter(o =>
    ['SHIPPED', 'DELIVERED'].includes(o.status)
  ).length;
  const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;

  // Calculate orders by month (last 6 months) for sparkline
  const ordersByMonth = (() => {
    const counts: number[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.getMonth() === date.getMonth() &&
               orderDate.getFullYear() === date.getFullYear();
      }).length;
      counts.push(count);
    }
    return counts;
  })();

  // Recent orders (last 5)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Determine tones
  const totalOrdersTone = totalOrders > 0 ? 'blue' : 'neutral';
  const completedTone = completedOrders > 0 ? 'green' : 'neutral';
  const pendingTone = pendingOrders > 0 ? 'amber' : 'green';
  const cancelledTone = cancelledOrders > 0 ? 'red' : 'green';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Overview of {customer?.name}'s account
        </p>
      </div>

      {/* Insights Section */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 tracking-tight uppercase mb-4">Insights</h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <KpiCard
              title="Total Orders"
              value={totalOrders}
              sub="All time"
              icon={<OrdersIcon />}
              tone={totalOrdersTone as 'blue' | 'neutral'}
              sparkline={ordersByMonth}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <KpiCard
              title="Completed"
              value={completedOrders}
              sub="Shipped & delivered"
              icon={<CheckIcon />}
              tone={completedTone as 'green' | 'neutral'}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <KpiCard
              title="Pending"
              value={pendingOrders}
              sub={pendingOrders > 0 ? 'In progress' : 'All clear'}
              icon={<ClockIcon />}
              tone={pendingTone as 'amber' | 'green'}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <KpiCard
              title="Cancelled"
              value={cancelledOrders}
              sub={cancelledOrders > 0 ? 'Cancelled orders' : 'No cancellations'}
              icon={<XIcon />}
              tone={cancelledTone as 'red' | 'green'}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Order Status</h3>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Completed</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{completedOrders}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pending</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{pendingOrders}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Cancelled</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{cancelledOrders}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Customer Information</h3>
          </div>
          <div className="p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Customer Code</dt>
                <dd className="font-semibold text-slate-900 mt-1">{customer?.code || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-semibold text-slate-900 mt-1 truncate">{customer?.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-semibold text-slate-900 mt-1">{customer?.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant={customer?.isActive ? 'success' : 'danger'}>
                    {customer?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent Orders</h3>
          <Link
            href={`/customers/${customerId}/orders`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>
        <div className="p-5">
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <OrdersIcon />
              </div>
              <p className="text-slate-500 mt-4 font-medium">No orders yet</p>
              <p className="text-slate-400 text-sm mt-1">Orders will appear here once created</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <motion.div
                  key={order.id}
                  onClick={() => router.push(`/sales/${order.id}`)}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 -mx-5 px-5 transition-colors first:pt-0 last:pb-0 first:-mt-3 last:-mb-3 first:rounded-t-xl last:rounded-b-xl"
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <div>
                    <div className="font-semibold text-slate-900">{order.orderNo}</div>
                    <div className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                    {order.requestedShipDate && (
                      <div className="text-xs text-slate-500 mt-1">
                        Ship: {new Date(order.requestedShipDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DELIVERED':
    case 'SHIPPED':
      return 'success';
    case 'PICKING':
    case 'PACKING':
    case 'READY_TO_SHIP':
      return 'info';
    case 'CONFIRMED':
    case 'ALLOCATED':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    case 'DRAFT':
    default:
      return 'default';
  }
}

// Icons
function OrdersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
