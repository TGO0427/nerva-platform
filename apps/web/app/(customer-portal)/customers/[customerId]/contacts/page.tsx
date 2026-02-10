'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useCustomerPortal } from '@/lib/contexts/customer-portal-context';
import {
  useCustomerContacts,
  useCreateCustomerContact,
  useUpdateCustomerContact,
  useDeleteCustomerContact,
} from '@/lib/queries/customers';
import type { CustomerContact } from '@nerva/shared';

export default function CustomerPortalContacts() {
  const params = useParams();
  const customerId = params.customerId as string;
  const { customer } = useCustomerPortal();

  const { data: contacts, isLoading } = useCustomerContacts(customerId);
  const createContact = useCreateCustomerContact(customerId);
  const updateContact = useUpdateCustomerContact(customerId);
  const deleteContact = useDeleteCustomerContact(customerId);

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    isPrimary: false,
  });

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
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await deleteContact.mutateAsync(contactId);
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500 mt-1">
            Manage contacts for {customer?.name}
          </p>
        </div>
        {!showForm && (
          <motion.button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Contact
          </motion.button>
        )}
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl bg-white border border-slate-200/70 shadow-sm"
          >
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingContact ? 'Edit Contact' : 'New Contact'}
              </h3>
            </div>
            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contact name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Title
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Sales Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+27 12 345 6789"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPrimary" className="text-sm text-slate-700">
                    Primary contact
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    isLoading={createContact.isPending || updateContact.isPending}
                  >
                    {editingContact ? 'Update' : 'Add'} Contact
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      <motion.div
        className="rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : !contacts || contacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <ContactIcon className="h-6 w-6" />
            </div>
            <p className="text-slate-600 mt-4 font-medium">No contacts</p>
            <p className="text-slate-400 text-sm mt-1">Add contacts to this customer</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{contact.name}</span>
                      {contact.isPrimary && (
                        <Badge variant="info">Primary</Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {contact.title && <span>{contact.title} &bull; </span>}
                      {contact.email || contact.phone || 'No contact info'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ContactIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
