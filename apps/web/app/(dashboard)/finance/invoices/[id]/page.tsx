'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { DownloadIcon } from '@/components/ui/export-actions';
import { EntityHistory } from '@/components/ui/entity-history';
import { downloadPdf } from '@/lib/utils/export';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useInvoice,
  useSendInvoice,
  useRecordPayment,
  useCancelInvoice,
  useVoidInvoice,
  InvoiceLine,
  InvoicePayment,
} from '@/lib/queries';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'VOID';

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'SENT':
      return 'warning';
    case 'PAID':
      return 'success';
    case 'PARTIALLY_PAID':
      return 'info';
    case 'OVERDUE':
      return 'danger';
    case 'CANCELLED':
      return 'default';
    case 'VOID':
      return 'default';
    default:
      return 'default';
  }
}

function formatStatus(status: string): string {
  return status?.replace(/_/g, ' ') || status || '';
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (['PAID', 'CANCELLED', 'VOID'].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const id = params.id as string;

  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: invoice, isLoading } = useInvoice(id);
  const sendInvoice = useSendInvoice();
  const recordPayment = useRecordPayment();
  const cancelInvoice = useCancelInvoice();
  const voidInvoice = useVoidInvoice();

  const handleSend = async () => {
    const confirmed = await confirm({
      title: 'Send Invoice',
      message: 'Are you sure you want to send this invoice? The status will change to SENT and the customer will be notified.',
      confirmLabel: 'Send Invoice',
    });
    if (confirmed) {
      try {
        await sendInvoice.mutateAsync(id);
        addToast('Invoice sent successfully', 'success');
      } catch (error) {
        console.error('Failed to send invoice:', error);
        addToast('Failed to send invoice', 'error');
      }
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Invoice',
      message: 'Are you sure you want to cancel this invoice? This action cannot be undone.',
      confirmLabel: 'Cancel Invoice',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await cancelInvoice.mutateAsync(id);
        addToast('Invoice cancelled', 'success');
      } catch (error) {
        console.error('Failed to cancel invoice:', error);
        addToast('Failed to cancel invoice', 'error');
      }
    }
  };

  const handleVoid = async () => {
    const confirmed = await confirm({
      title: 'Void Invoice',
      message: 'Are you sure you want to void this invoice? This action cannot be undone and any outstanding balance will be written off.',
      confirmLabel: 'Void Invoice',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await voidInvoice.mutateAsync(id);
        addToast('Invoice voided', 'success');
      } catch (error) {
        console.error('Failed to void invoice:', error);
        addToast('Failed to void invoice', 'error');
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

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Invoice not found</h2>
        <Link href="/finance/invoices" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const balanceDue = invoice.totalAmount - invoice.amountPaid;
  const overdue = isOverdue(invoice.dueDate, invoice.status);

  return (
    <div>
      <Breadcrumbs />

      {/* Header */}
      <div className="bg-indigo-700 text-white p-6 rounded-lg mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.invoiceNo}</h1>
              <Badge
                variant={getStatusVariant(invoice.status)}
                className="text-white bg-opacity-30"
              >
                {formatStatus(invoice.status)}
              </Badge>
            </div>
            <p className="text-indigo-100 text-sm mt-1">
              {invoice.customerName}
              {invoice.orderNo && (
                <span className="ml-2">
                  &middot; SO: {invoice.orderNo}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-start">
            <Button
              variant="secondary"
              onClick={() => downloadPdf(`/finance/invoices/${id}/pdf`, `INV-${invoice.invoiceNo}.pdf`)}
              className="print:hidden bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <DownloadIcon />
              Download PDF
            </Button>
            {invoice.status === 'DRAFT' && (
              <Button
                variant="secondary"
                className="bg-white text-indigo-700 hover:bg-indigo-50"
                onClick={handleSend}
                isLoading={sendInvoice.isPending}
              >
                <SendIcon />
                Send Invoice
              </Button>
            )}
            {['SENT', 'PARTIALLY_PAID'].includes(invoice.status) && (
              <Button
                variant="secondary"
                className="bg-white text-indigo-700 hover:bg-indigo-50"
                onClick={() => setShowPaymentForm(!showPaymentForm)}
              >
                <PaymentIcon />
                Record Payment
              </Button>
            )}
            {invoice.status === 'DRAFT' && (
              <Button
                variant="secondary"
                className="bg-red-100 text-red-700 hover:bg-red-200"
                onClick={handleCancel}
                isLoading={cancelInvoice.isPending}
              >
                Cancel
              </Button>
            )}
            {['SENT', 'PARTIALLY_PAID'].includes(invoice.status) && (
              <Button
                variant="danger"
                onClick={handleVoid}
                isLoading={voidInvoice.isPending}
              >
                Void
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Invoice Date</div>
            <div className="font-medium">
              {new Date(invoice.invoiceDate).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Due Date</div>
            <div className="font-medium">
              {invoice.dueDate ? (
                <span className="flex items-center gap-2">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                  {overdue && (
                    <span className="text-xs font-semibold text-red-600 uppercase">Overdue</span>
                  )}
                </span>
              ) : (
                '-'
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Payment Terms</div>
            <div className="font-medium">{invoice.paymentTerms || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Total Amount</div>
            <div className="font-medium text-lg">
              {formatCurrency(invoice.totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.lines && invoice.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Disc %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Line Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {invoice.lines.map((line: InvoiceLine, index: number) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        {line.sku || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {line.description || line.itemDescription || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                        {line.qty}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                        {line.discountPct > 0 ? `${line.discountPct}%` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                        {formatCurrency(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium">
                      Subtotal:
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium">
                      VAT (15%):
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(invoice.taxAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No line items.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Summary */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Total</span>
                <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Amount Paid</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Balance Due</span>
                {balanceDue > 0 ? (
                  <span className="font-bold text-lg text-red-600">
                    {formatCurrency(balanceDue)}
                  </span>
                ) : (
                  <span className="font-bold text-lg text-green-600">Fully Paid</span>
                )}
              </div>
            </div>

            {/* Right: Payments table */}
            <div>
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Method</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Reference</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {invoice.payments.map((payment: InvoicePayment) => (
                        <tr key={payment.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">
                            {payment.paymentMethod || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">
                            {payment.reference || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-500">
                            {payment.recordedByName || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>No payments recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Form */}
      {showPaymentForm && (
        <RecordPaymentForm
          invoiceId={id}
          balanceDue={balanceDue}
          onSuccess={() => {
            setShowPaymentForm(false);
            addToast('Payment recorded successfully', 'success');
          }}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <EntityHistory entityType="Invoice" entityId={id} />
    </div>
  );
}

function RecordPaymentForm({
  invoiceId,
  balanceDue,
  onSuccess,
  onCancel,
}: {
  invoiceId: string;
  balanceDue: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: today,
    paymentMethod: 'EFT',
    reference: '',
    notes: '',
  });

  const recordPayment = useRecordPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) return;

    try {
      await recordPayment.mutateAsync({
        invoiceId,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate || undefined,
        paymentMethod: formData.paymentMethod || undefined,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  return (
    <Card className="mb-6 border-indigo-200">
      <CardHeader>
        <CardTitle>Record Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="payment-amount">Amount *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={`Max: ${formatCurrency(balanceDue)}`}
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Balance due: {formatCurrency(balanceDue)}
              </p>
            </div>
            <div>
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input
                id="payment-date"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                id="payment-method"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                options={[
                  { value: 'EFT', label: 'EFT' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Card', label: 'Card' },
                  { value: 'Cheque', label: 'Cheque' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g. Bank reference number"
              />
            </div>
            <div>
              <Label htmlFor="payment-notes">Notes</Label>
              <Input
                id="payment-notes"
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SendIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}
