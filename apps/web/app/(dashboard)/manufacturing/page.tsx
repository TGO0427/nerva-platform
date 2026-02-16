'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { MetricGrid, PageShell } from '@/components/ui/motion';
import { useWorkOrders } from '@/lib/queries/manufacturing';

export default function ManufacturingPage() {
  const { data: activeData } = useWorkOrders({ page: 1, limit: 1, status: 'IN_PROGRESS' });
  const { data: draftData } = useWorkOrders({ page: 1, limit: 1, status: 'DRAFT' });
  const { data: releasedData } = useWorkOrders({ page: 1, limit: 1, status: 'RELEASED' });
  const { data: completedData } = useWorkOrders({ page: 1, limit: 1, status: 'COMPLETED' });

  const activeCount = activeData?.meta?.total || 0;
  const draftCount = draftData?.meta?.total || 0;
  const releasedCount = releasedData?.meta?.total || 0;
  const completedCount = completedData?.meta?.total || 0;

  return (
    <PageShell className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Manufacturing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage production, bills of materials, and work orders
        </p>
      </div>

      <MetricGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="In Progress" value={activeCount} icon={<PlayIcon />} iconColor="yellow" />
        <StatCard title="Draft" value={draftCount} icon={<PencilIcon />} iconColor="gray" />
        <StatCard title="Released" value={releasedCount} icon={<RocketIcon />} iconColor="blue" />
        <StatCard title="Completed" value={completedCount} icon={<CheckIcon />} iconColor="green" />
      </MetricGrid>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/manufacturing/work-orders">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                <WorkOrderIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Work Orders</h3>
                <p className="text-sm text-slate-500">Create and manage production orders</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/manufacturing/boms">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                <BomIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Bills of Materials</h3>
                <p className="text-sm text-slate-500">Define product recipes and components</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/manufacturing/routings">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-purple-100 rounded-lg">
                <RoutingIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Routings</h3>
                <p className="text-sm text-slate-500">Define production sequences and operations</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/manufacturing/workstations">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                <FactoryIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Workstations</h3>
                <p className="text-sm text-slate-500">Manage machines and work centers</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/manufacturing/ledger">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-slate-100 rounded-lg">
                <LedgerIcon className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Production Ledger</h3>
                <p className="text-sm text-slate-500">View production history and transactions</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </PageShell>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
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

function WorkOrderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function BomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function RoutingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function FactoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function LedgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
