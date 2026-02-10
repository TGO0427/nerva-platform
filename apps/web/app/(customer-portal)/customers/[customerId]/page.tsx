'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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

  // Calculate orders by month (last 6 months)
  const ordersByMonth = (() => {
    const months: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const count = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.getMonth() === date.getMonth() &&
               orderDate.getFullYear() === date.getFullYear();
      }).length;
      months.push({ month: monthKey, count });
    }
    return months;
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of {customer?.name}'s account
        </p>
      </div>

      {/* Insights Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-1">Total Orders</div>
              <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-1">Pending</div>
              <div className="text-2xl font-bold text-orange-600">{pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-1">Cancelled</div>
              <div className="text-2xl font-bold text-red-600">{cancelledOrders}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Order Trends (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersByMonth.some(m => m.count > 0) ? (
            <SimpleBarChart data={ordersByMonth} color="blue" />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No order data to display</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{completedOrders}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{pendingOrders}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cancelled</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{cancelledOrders}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Customer Code</dt>
                <dd className="font-medium mt-1">{customer?.code || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium mt-1">{customer?.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium mt-1">{customer?.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant={customer?.isActive ? 'success' : 'danger'}>
                    {customer?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link
            href={`/customers/${customerId}/orders`}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <OrderIcon className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p className="font-medium">No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here once created</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/sales/${order.id}`)}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{order.orderNo}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                    {order.requestedShipDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        Ship: {new Date(order.requestedShipDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

function OrderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function SimpleBarChart({
  data,
}: {
  data: Array<{ month: string; count: number }>;
  color?: string;
}) {
  const values = data.map(d => d.count);
  const maxValue = Math.max(...values, 1);
  const chartHeight = 180;
  const padding = 40;

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = maxValue > 0 ? ((maxValue - item.count) / maxValue) * 100 : 100;
    return { x, y, count: item.count, month: item.month };
  });

  // Create SVG path for the line
  const linePath = points.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x} ${point.y}`;
  }).join(' ');

  // Create area fill path
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="relative" style={{ height: chartHeight + padding }}>
      {/* Chart area */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />

          {/* Area fill */}
          <path d={areaPath} fill="url(#gradient)" opacity="0.1" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Data points and values */}
        {points.map((point, index) => (
          <div
            key={index}
            className="absolute flex flex-col items-center"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Value label */}
            <span
              className="text-xs text-gray-600 font-medium absolute"
              style={{ top: '-20px' }}
            >
              {point.count}
            </span>
            {/* Dot */}
            <div className="w-2 h-2 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        {data.map((item, index) => (
          <span key={index} className="text-xs text-gray-500">
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
}
