'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNonConformances } from '@/lib/queries';
import type { NonConformance, NonConformanceStatus, NcSeverity } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'CRITICAL', label: 'Critical' },
];

function getStatusVariant(status: NonConformanceStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'OPEN':
      return 'info';
    case 'UNDER_REVIEW':
      return 'warning';
    case 'RESOLVED':
      return 'success';
    case 'CLOSED':
      return 'default';
    default:
      return 'default';
  }
}

function getSeverityVariant(severity: NcSeverity): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (severity) {
    case 'MINOR':
      return 'default';
    case 'MAJOR':
      return 'warning';
    case 'CRITICAL':
      return 'danger';
    default:
      return 'default';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export default function QualityPage() {
  const router = useRouter();
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    status: '',
    severity: '',
    search: '',
  });

  const { data, isLoading } = useNonConformances({
    page: params.page,
    limit: params.limit,
    status: params.status || undefined,
    severity: params.severity || undefined,
    search: params.search || undefined,
  });

  const ncList = data?.data ?? [];
  const meta = data?.meta;
  const totalCount = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  const handleSearch = (value: string) => {
    setParams((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setParams((prev) => ({ ...prev, status: value, page: 1 }));
  };

  const handleSeverityFilter = (value: string) => {
    setParams((prev) => ({ ...prev, severity: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality / Non-Conformances</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage product quality issues and defects
          </p>
        </div>
        <Link href="/manufacturing/quality/new">
          <Button>
            <PlusIcon />
            New NC
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total NCs"
          value={totalCount}
          icon={<ClipboardIcon />}
          iconColor="gray"
        />
        <StatCard
          title="Open"
          value={ncList.filter((nc) => nc.status === 'OPEN').length}
          icon={<AlertCircleIcon />}
          iconColor="blue"
        />
        <StatCard
          title="Under Review"
          value={ncList.filter((nc) => nc.status === 'UNDER_REVIEW').length}
          icon={<SearchIcon />}
          iconColor="yellow"
        />
        <StatCard
          title="Critical"
          value={ncList.filter((nc) => nc.severity === 'CRITICAL').length}
          icon={<ExclamationIcon />}
          iconColor="red"
          alert={ncList.filter((nc) => nc.severity === 'CRITICAL').length > 0}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-primary-500 focus:ring-primary-500"
                value={params.status}
                onChange={(e) => handleStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-primary-500 focus:ring-primary-500"
                value={params.severity}
                onChange={(e) => handleSeverityFilter(e.target.value)}
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <Input
                placeholder="Search by NC#, description..."
                value={params.search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : ncList.length === 0 ? (
            <div className="text-center py-16">
              <QualityIcon />
              <h3 className="mt-4 text-lg font-medium text-slate-900">No non-conformances found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {params.status || params.severity || params.search
                  ? 'No results match the selected filters'
                  : 'Create your first non-conformance report'}
              </p>
              {!params.status && !params.severity && !params.search && (
                <Link href="/manufacturing/quality/new">
                  <Button className="mt-4">Create NC Report</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">NC#</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Severity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">WO#</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Defect Type</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Qty Affected</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ncList.map((nc: NonConformance) => (
                    <tr
                      key={nc.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/manufacturing/quality/${nc.id}`)}
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/manufacturing/quality/${nc.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {nc.ncNo}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusVariant(nc.status)}>
                          {formatStatus(nc.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getSeverityVariant(nc.severity)}>
                          {nc.severity}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-900">
                        {nc.itemSku || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {nc.workOrderId && nc.workOrderNo ? (
                          <Link
                            href={`/manufacturing/work-orders/${nc.workOrderId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {nc.workOrderNo}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {nc.defectType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {nc.qtyAffected.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(nc.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Showing {(params.page - 1) * params.limit + 1} to{' '}
                {Math.min(params.page * params.limit, totalCount)} of {totalCount} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={params.page <= 1}
                  onClick={() => handlePageChange(params.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {params.page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={params.page >= totalPages}
                  onClick={() => handlePageChange(params.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function QualityIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
