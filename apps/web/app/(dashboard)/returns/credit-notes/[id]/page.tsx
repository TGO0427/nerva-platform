'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { DownloadIcon } from '@/components/ui/export-actions';
import { downloadPdf } from '@/lib/utils/export';
import {
  useCreditNote,
  useApproveCreditNote,
  usePostCreditNote,
  useCancelCreditNote,
} from '@/lib/queries';

export default function CreditNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const creditNoteId = params.id as string;

  const { data: creditNote, isLoading } = useCreditNote(creditNoteId);

  const approveCreditNote = useApproveCreditNote();
  const postCreditNote = usePostCreditNote();
  const cancelCreditNote = useCancelCreditNote();

  const handleApprove = async () => {
    if (confirm('Approve this credit note?')) {
      try {
        await approveCreditNote.mutateAsync(creditNoteId);
      } catch (error) {
        console.error('Failed to approve credit note:', error);
      }
    }
  };

  const handlePost = async () => {
    if (confirm('Post this credit note? This will finalize it.')) {
      try {
        await postCreditNote.mutateAsync(creditNoteId);
      } catch (error) {
        console.error('Failed to post credit note:', error);
      }
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      try {
        await cancelCreditNote.mutateAsync({ creditNoteId, reason });
        router.push('/returns/credit-notes');
      } catch (error) {
        console.error('Failed to cancel credit note:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!creditNote) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Credit note not found</h2>
      </div>
    );
  }

  const canApprove = creditNote.status === 'PENDING_APPROVAL';
  const canPost = creditNote.status === 'APPROVED';
  const canCancel = !['POSTED', 'CANCELLED'].includes(creditNote.status);

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{creditNote.creditNoteNo}</h1>
            <Badge variant={getStatusVariant(creditNote.status)}>
              {creditNote.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Created {new Date(creditNote.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadPdf(`/finance/credits/${creditNoteId}/pdf`, `CN-${creditNote.creditNoteNo}.pdf`)} className="print:hidden">
            <DownloadIcon />
            Download PDF
          </Button>
          {canApprove && (
            <Button onClick={handleApprove} isLoading={approveCreditNote.isPending}>
              <CheckIcon />
              Approve
            </Button>
          )}
          {canPost && (
            <Button onClick={handlePost} isLoading={postCreditNote.isPending}>
              <SendIcon />
              Post
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} isLoading={cancelCreditNote.isPending}>
              <XIcon />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Credit Note Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Credit Note Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Customer</dt>
                <dd className="font-medium">{creditNote.customerName || creditNote.customerId}</dd>
              </div>
              <div>
                <dt className="text-slate-500">RMA</dt>
                <dd className="font-medium">
                  <Link
                    href={`/returns/${creditNote.rmaId}`}
                    className="text-primary-600 hover:underline"
                  >
                    {creditNote.rmaNo || creditNote.rmaId.slice(0, 8)}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Amount</dt>
                <dd className="text-xl font-bold text-slate-900">
                  {creditNote.currency} {creditNote.amount.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Currency</dt>
                <dd className="font-medium">{creditNote.currency}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Reason</dt>
                <dd className="font-medium">{creditNote.reason}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval & Posting</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Approved By</dt>
                <dd className="font-medium">{creditNote.approvedBy || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Approved At</dt>
                <dd className="font-medium">
                  {creditNote.approvedAt
                    ? new Date(creditNote.approvedAt).toLocaleDateString()
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Posted At</dt>
                <dd className="font-medium">
                  {creditNote.postedAt
                    ? new Date(creditNote.postedAt).toLocaleDateString()
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created By</dt>
                <dd className="font-medium">{creditNote.createdBy || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {creditNote.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{creditNote.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Link href="/returns/credit-notes">
          <Button variant="secondary">
            <ArrowLeftIcon />
            Back to Credit Notes
          </Button>
        </Link>
      </div>
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'POSTED':
      return 'success';
    case 'APPROVED':
      return 'info';
    case 'PENDING_APPROVAL':
      return 'warning';
    case 'DRAFT':
      return 'default';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}
