'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCustomer,
  useCustomerActivity,
  useCustomerContacts,
  useCreateCustomerContact,
  useUpdateCustomerContact,
  useDeleteCustomerContact,
  useCustomerNotes,
  useCreateCustomerNote,
  useDeleteCustomerNote,
  useOrders,
  type SalesOrderWithCustomer,
} from '@/lib/queries';
import type { Customer, CustomerContact, CustomerNote, AuditEntry } from '@nerva/shared';

type Tab = 'company' | 'contacts' | 'notes' | 'orders';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('company');

  const { data: customer, isLoading } = useCustomer(id);
  const { data: activityLog } = useCustomerActivity(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Customer not found</h2>
        <p className="text-slate-500 mt-1">The customer you are looking for does not exist.</p>
        <Link href="/master-data/customers" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to customers
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'company', label: 'Company Information' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'notes', label: 'Notes' },
    { key: 'orders', label: 'Order History' },
  ];

  return (
    <div>
      <Breadcrumbs />

      {/* Header */}
      <div className="bg-blue-700 text-white p-6 rounded-lg mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-blue-100 text-sm mt-1">
              Dashboard &gt; Customers &gt; {customer.name}
            </p>
          </div>
          <Button
            variant="secondary"
            className="bg-white text-blue-700 hover:bg-blue-50"
            onClick={() => router.push(`/master-data/customers/${id}/edit`)}
          >
            Edit Customer
          </Button>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Customer Code</div>
            <div className="font-medium">{customer.code || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Email</div>
            <div className="font-medium text-primary-600">{customer.email || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Phone</div>
            <div className="font-medium">{customer.phone || '-'}</div>
          </CardContent>
        </Card>
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
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'company' && (
        <CompanyInfoTab customer={customer} activityLog={activityLog || []} />
      )}
      {activeTab === 'contacts' && <ContactsTab customerId={id} />}
      {activeTab === 'notes' && <NotesTab customerId={id} />}
      {activeTab === 'orders' && <OrdersTab customerId={id} />}
    </div>
  );
}

function CompanyInfoTab({ customer, activityLog }: { customer: Customer; activityLog: AuditEntry[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Customer Code</div>
              <div className="mt-1">{customer.code || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Email</div>
              <div className="mt-1 text-primary-600">{customer.email || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Contact Number</div>
              <div className="mt-1">{customer.phone || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Status</div>
              <div className="mt-1">
                <Badge variant={customer.isActive ? 'success' : 'danger'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Address Card */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Street</div>
              <div className="mt-1">{formatAddress(customer.billingAddressLine1, customer.billingAddressLine2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">City</div>
              <div className="mt-1">{customer.billingCity || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Postal Code</div>
              <div className="mt-1">{customer.billingPostalCode || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Country</div>
              <div className="mt-1">{customer.billingCountry || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address Card */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Street</div>
              <div className="mt-1">{formatAddress(customer.shippingAddressLine1, customer.shippingAddressLine2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">City</div>
              <div className="mt-1">{customer.shippingCity || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Postal Code</div>
              <div className="mt-1">{customer.shippingPostalCode || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Country</div>
              <div className="mt-1">{customer.shippingCountry || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">VAT Number</div>
              <div className="mt-1 text-primary-600">{customer.vatNo || '-'}</div>
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
                <div key={entry.id} className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3">
                  <div>
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-slate-500 ml-2">
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

function ContactsTab({ customerId }: { customerId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    isPrimary: false,
  });

  const { data: contacts, isLoading } = useCustomerContacts(customerId);
  const createContact = useCreateCustomerContact(customerId);
  const updateContact = useUpdateCustomerContact(customerId);
  const deleteContact = useDeleteCustomerContact(customerId);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', title: '', isPrimary: false });
    setEditingContact(null);
    setShowForm(false);
  };

  const handleEdit = (contact: CustomerContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      isPrimary: contact.isPrimary,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await updateContact.mutateAsync({
          contactId: editingContact.id,
          data: formData,
        });
      } else {
        await createContact.mutateAsync(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact.mutateAsync(contactId);
      } catch (error) {
        console.error('Failed to delete contact:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Customer Contacts</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Add Contact</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingContact ? 'Edit Contact' : 'New Contact'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded border-slate-300"
                />
                <Label htmlFor="isPrimary" className="mb-0">Primary Contact</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
                  {createContact.isPending || updateContact.isPending ? 'Saving...' : 'Save Contact'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {contacts && contacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {contact.name}
                      {contact.isPrimary && (
                        <Badge variant="success" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    {contact.title && (
                      <div className="text-sm text-slate-500">{contact.title}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(contact)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  {contact.email && (
                    <div className="text-primary-600">{contact.email}</div>
                  )}
                  {contact.phone && (
                    <div className="text-slate-600">{contact.phone}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !showForm && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-slate-500">
                <UsersIcon />
                <h3 className="mt-4 font-medium text-slate-900">No contacts yet</h3>
                <p className="mt-1">Add contacts to manage customer relationships.</p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

function NotesTab({ customerId }: { customerId: string }) {
  const [newNote, setNewNote] = useState('');

  const { data: notes, isLoading } = useCustomerNotes(customerId);
  const createNote = useCreateCustomerNote(customerId);
  const deleteNote = useDeleteCustomerNote(customerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await createNote.mutateAsync(newNote.trim());
      setNewNote('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote.mutateAsync(noteId);
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Note</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note..."
              className="w-full h-24 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Button type="submit" disabled={createNote.isPending || !newNote.trim()}>
              {createNote.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {notes && notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-slate-800 whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-2 text-sm text-slate-500">
                      {note.createdByName && <span>{note.createdByName} - </span>}
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-slate-400 hover:text-red-600 ml-4"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <NotesIcon />
              <h3 className="mt-4 font-medium text-slate-900">No notes yet</h3>
              <p className="mt-1">Add notes to track important information about this customer.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OrdersTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useOrders({
    page,
    limit: 10,
    customerId,
    status: (statusFilter as SalesOrderWithCustomer['status']) || undefined,
  });

  const orders = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;

  const orderStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    DRAFT: 'default',
    CONFIRMED: 'info',
    ALLOCATED: 'info',
    PICKING: 'warning',
    PACKING: 'warning',
    READY_TO_SHIP: 'info',
    SHIPPED: 'success',
    DELIVERED: 'success',
    CANCELLED: 'danger',
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {total > 0 && (
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{total} order{total !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'CONFIRMED', 'ALLOCATED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              statusFilter === s
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="pt-4">
                <div
                  className="flex items-center justify-between"
                  onClick={() => router.push(`/sales/${order.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium text-primary-600">{order.orderNo}</span>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.requestedShipDate && (
                      <span className="text-xs text-slate-400">
                        Ship by {new Date(order.requestedShipDate).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant={orderStatusVariant[order.status] || 'default'}>
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <OrdersIcon />
              <h3 className="mt-4 font-medium text-slate-900">No orders found</h3>
              <p className="mt-1">
                {statusFilter ? 'No orders match the selected filter.' : 'This customer has no orders yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatAddress(line1: string | null, line2: string | null): string {
  const parts = [line1, line2].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
