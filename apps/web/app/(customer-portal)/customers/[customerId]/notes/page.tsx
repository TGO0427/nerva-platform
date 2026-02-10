'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useCustomerPortal } from '@/lib/contexts/customer-portal-context';
import {
  useCustomerNotes,
  useCreateCustomerNote,
  useDeleteCustomerNote,
} from '@/lib/queries/customers';

export default function CustomerPortalNotes() {
  const params = useParams();
  const customerId = params.customerId as string;
  const { customer } = useCustomerPortal();

  const { data: notes, isLoading } = useCustomerNotes(customerId);
  const createNote = useCreateCustomerNote(customerId);
  const deleteNote = useDeleteCustomerNote(customerId);

  const [noteContent, setNoteContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      await createNote.mutateAsync(noteContent.trim());
      setNoteContent('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteNote.mutateAsync(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
        <p className="text-slate-500 mt-1">
          Notes and comments for {customer?.name}
        </p>
      </div>

      {/* Add Note Form */}
      <motion.div
        className="rounded-2xl bg-white border border-slate-200/70 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Add Note</h3>
        </div>
        <div className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write a note about this customer..."
              rows={3}
              className="resize-none"
            />
            <Button
              type="submit"
              disabled={!noteContent.trim()}
              isLoading={createNote.isPending}
            >
              Add Note
            </Button>
          </form>
        </div>
      </motion.div>

      {/* Notes List */}
      <motion.div
        className="rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">All Notes</h3>
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : !notes || notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <NoteIcon className="h-6 w-6" />
              </div>
              <p className="text-slate-600 mt-4 font-medium">No notes yet</p>
              <p className="text-slate-400 text-sm mt-1">Add a note above to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  className="p-5 hover:bg-slate-50 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-slate-900 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {(note.createdByName || 'S').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {note.createdByName || 'System'} &bull;{' '}
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-4"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
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
