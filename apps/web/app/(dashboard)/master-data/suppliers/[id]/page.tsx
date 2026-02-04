'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useSupplier, useSupplierActivity } from '@/lib/queries';
import type { Supplier, AuditEntry } from '@nerva/shared';

type Tab = 'company' | 'contacts' | 'notes' | 'ncrs';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('company');

  const { data: supplier, isLoading } = useSupplier(id);
  const { data: activityLog } = useSupplierActivity(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Supplier not found</h2>
        <p className="text-gray-500 mt-1">The supplier you are looking for does not exist.</p>
        <Link href="/master-data/suppliers" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to suppliers
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'company', label: 'Company Information' },
    { key: 'contacts', label: 'Users' },
    { key: 'notes', label: 'Notes' },
    { key: 'ncrs', label: 'NCRs' },
  ];

  return (
    <div>
      <Breadcrumbs />

      {/* Header */}
      <div className="bg-green-700 text-white p-6 rounded-t-lg -mx-6 -mt-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            <p className="text-green-100 text-sm mt-1">
              Dashboard &gt; Suppliers &gt; {supplier.name}
            </p>
          </div>
          <Button
            variant="secondary"
            className="bg-white text-green-700 hover:bg-green-50"
            onClick={() => router.push(`/master-data/suppliers/${id}/edit`)}
          >
            Actions
          </Button>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Contact Person</div>
            <div className="font-medium">{supplier.contactPerson || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium text-primary-600">{supplier.email || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-gray-500">Phone</div>
            <div className="font-medium">{supplier.phone || '-'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('company')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'company'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Company Profile
          </button>
          <span className="py-3 px-1 text-sm text-gray-400">Products & Services</span>
          <span className="py-3 px-1 text-sm text-gray-400">Volume Contracts</span>
          <span className="py-3 px-1 text-sm text-gray-400">Activity Log</span>
        </nav>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'company' && (
        <CompanyInfoTab supplier={supplier} activityLog={activityLog || []} />
      )}
      {activeTab === 'contacts' && <ContactsTab />}
      {activeTab === 'notes' && <NotesTab />}
      {activeTab === 'ncrs' && <NcrsTab />}
    </div>
  );
}

function CompanyInfoTab({ supplier, activityLog }: { supplier: Supplier; activityLog: AuditEntry[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          <PencilIcon />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Contact Person</div>
              <div className="mt-1">{supplier.contactPerson || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Email</div>
              <div className="mt-1 text-primary-600">{supplier.email || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Contact Number</div>
              <div className="mt-1">{supplier.phone || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Status</div>
              <div className="mt-1">
                <Badge variant={supplier.isActive ? 'success' : 'danger'}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Postal Address Card */}
      <Card>
        <CardHeader>
          <CardTitle>Postal Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Street</div>
              <div className="mt-1">{formatAddress(supplier.addressLine1, supplier.addressLine2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">District</div>
              <div className="mt-1">{supplier.city || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">City</div>
              <div className="mt-1">{supplier.city || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Zip Code</div>
              <div className="mt-1">{supplier.postalCode || '-'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm font-medium text-gray-500">Country</div>
              <div className="mt-1">{supplier.country || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Address Card */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Street</div>
              <div className="mt-1">{formatAddress(supplier.tradingAddressLine1, supplier.tradingAddressLine2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">District</div>
              <div className="mt-1">{supplier.tradingCity || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">City</div>
              <div className="mt-1">{supplier.tradingCity || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Zip Code</div>
              <div className="mt-1">{supplier.tradingPostalCode || '-'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm font-medium text-gray-500">Country</div>
              <div className="mt-1">{supplier.tradingCountry || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registration Information</CardTitle>
          <PencilIcon />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">VAT Number</div>
              <div className="mt-1 text-primary-600">{supplier.vatNo || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Registration Number</div>
              <div className="mt-1 text-primary-600">{supplier.registrationNo || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      {activityLog.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLog.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3">
                  <div>
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-gray-500 ml-2">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ContactsTab() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center text-gray-500">
          <UsersIcon />
          <h3 className="mt-4 font-medium text-gray-900">Contacts coming soon</h3>
          <p className="mt-1">Manage supplier contacts and users in Phase 2.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NotesTab() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center text-gray-500">
          <NotesIcon />
          <h3 className="mt-4 font-medium text-gray-900">Notes coming soon</h3>
          <p className="mt-1">Add notes and comments about this supplier in Phase 2.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NcrsTab() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center text-gray-500">
          <AlertIcon />
          <h3 className="mt-4 font-medium text-gray-900">NCRs coming soon</h3>
          <p className="mt-1">Track non-conformance reports for this supplier in Phase 2.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatAddress(line1: string | null, line2: string | null): string {
  const parts = [line1, line2].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
