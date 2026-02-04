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
  useSupplier,
  useSupplierActivity,
  useSupplierContacts,
  useCreateSupplierContact,
  useUpdateSupplierContact,
  useDeleteSupplierContact,
  useSupplierNotes,
  useCreateSupplierNote,
  useDeleteSupplierNote,
  useSupplierNcrs,
  useCreateSupplierNcr,
  useResolveSupplierNcr,
} from '@/lib/queries';
import type { Supplier, SupplierContact, SupplierNote, SupplierNcr, AuditEntry } from '@nerva/shared';

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
    { key: 'contacts', label: 'Contacts' },
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
            Edit Supplier
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
      {activeTab === 'contacts' && <ContactsTab supplierId={id} />}
      {activeTab === 'notes' && <NotesTab supplierId={id} />}
      {activeTab === 'ncrs' && <NcrsTab supplierId={id} />}
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
              <div className="text-sm font-medium text-gray-500">City</div>
              <div className="mt-1">{supplier.city || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Postal Code</div>
              <div className="mt-1">{supplier.postalCode || '-'}</div>
            </div>
            <div>
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
              <div className="text-sm font-medium text-gray-500">City</div>
              <div className="mt-1">{supplier.tradingCity || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Postal Code</div>
              <div className="mt-1">{supplier.tradingPostalCode || '-'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Country</div>
              <div className="mt-1">{supplier.tradingCountry || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Information</CardTitle>
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

function ContactsTab({ supplierId }: { supplierId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    isPrimary: false,
  });

  const { data: contacts, isLoading } = useSupplierContacts(supplierId);
  const createContact = useCreateSupplierContact();
  const updateContact = useUpdateSupplierContact();
  const deleteContact = useDeleteSupplierContact();

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', title: '', isPrimary: false });
    setEditingContact(null);
    setShowForm(false);
  };

  const handleEdit = (contact: SupplierContact) => {
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
          supplierId,
          data: formData,
        });
      } else {
        await createContact.mutateAsync({ supplierId, data: formData });
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact.mutateAsync({ contactId, supplierId });
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
        <h3 className="text-lg font-medium">Supplier Contacts</h3>
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
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
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
                      <div className="text-sm text-gray-500">{contact.title}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(contact)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
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
                    <div className="text-gray-600">{contact.phone}</div>
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
              <div className="text-center text-gray-500">
                <UsersIcon />
                <h3 className="mt-4 font-medium text-gray-900">No contacts yet</h3>
                <p className="mt-1">Add contacts to manage supplier relationships.</p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

function NotesTab({ supplierId }: { supplierId: string }) {
  const [newNote, setNewNote] = useState('');

  const { data: notes, isLoading } = useSupplierNotes(supplierId);
  const createNote = useCreateSupplierNote();
  const deleteNote = useDeleteSupplierNote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await createNote.mutateAsync({ supplierId, content: newNote.trim() });
      setNewNote('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote.mutateAsync({ noteId, supplierId });
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
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-gray-400 hover:text-red-600 ml-4"
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
            <div className="text-center text-gray-500">
              <NotesIcon />
              <h3 className="mt-4 font-medium text-gray-900">No notes yet</h3>
              <p className="mt-1">Add notes to track important information about this supplier.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NcrsTab({ supplierId }: { supplierId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [resolvingNcr, setResolvingNcr] = useState<SupplierNcr | null>(null);
  const [resolution, setResolution] = useState('');
  const [formData, setFormData] = useState({
    ncrType: 'QUALITY' as const,
    description: '',
  });

  const { data: ncrs, isLoading } = useSupplierNcrs(supplierId);
  const createNcr = useCreateSupplierNcr();
  const resolveNcr = useResolveSupplierNcr();

  const ncrTypes = [
    { value: 'QUALITY', label: 'Quality Issue' },
    { value: 'DELIVERY', label: 'Delivery Issue' },
    { value: 'QUANTITY', label: 'Quantity Issue' },
    { value: 'DOCUMENTATION', label: 'Documentation Issue' },
    { value: 'OTHER', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNcr.mutateAsync({ supplierId, data: formData });
      setFormData({ ncrType: 'QUALITY', description: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create NCR:', error);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingNcr || !resolution.trim()) return;
    try {
      await resolveNcr.mutateAsync({
        ncrId: resolvingNcr.id,
        resolution: resolution.trim(),
        supplierId,
      });
      setResolvingNcr(null);
      setResolution('');
    } catch (error) {
      console.error('Failed to resolve NCR:', error);
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
        <h3 className="text-lg font-medium">Non-Conformance Reports</h3>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Create NCR</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New NCR</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="ncrType">Type *</Label>
                <select
                  id="ncrType"
                  value={formData.ncrType}
                  onChange={(e) => setFormData({ ...formData, ncrType: e.target.value as typeof formData.ncrType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {ncrTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the non-conformance..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createNcr.isPending}>
                  {createNcr.isPending ? 'Creating...' : 'Create NCR'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {resolvingNcr && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle>Resolve NCR: {resolvingNcr.ncrNo}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <Label htmlFor="resolution">Resolution *</Label>
                <textarea
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe how the issue was resolved..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={resolveNcr.isPending}>
                  {resolveNcr.isPending ? 'Resolving...' : 'Mark as Resolved'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setResolvingNcr(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {ncrs && ncrs.length > 0 ? (
        <div className="space-y-4">
          {ncrs.map((ncr) => (
            <Card key={ncr.id} className={ncr.status === 'RESOLVED' ? 'bg-gray-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ncr.ncrNo}</span>
                      <Badge variant={getNcrStatusVariant(ncr.status)}>
                        {ncr.status}
                      </Badge>
                      <Badge variant="default">{ncr.ncrType}</Badge>
                    </div>
                    <p className="mt-2 text-gray-700">{ncr.description}</p>
                    {ncr.resolution && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-sm font-medium text-green-800">Resolution:</div>
                        <p className="text-sm text-green-700">{ncr.resolution}</p>
                        {ncr.resolvedAt && (
                          <div className="text-xs text-green-600 mt-1">
                            Resolved on {new Date(ncr.resolvedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-gray-500">
                      Created {new Date(ncr.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {ncr.status === 'OPEN' && !resolvingNcr && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setResolvingNcr(ncr)}
                    >
                      Resolve
                    </Button>
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
              <div className="text-center text-gray-500">
                <AlertIcon />
                <h3 className="mt-4 font-medium text-gray-900">No NCRs yet</h3>
                <p className="mt-1">Track non-conformance reports for quality management.</p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

function getNcrStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'OPEN':
      return 'danger';
    default:
      return 'default';
  }
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
