import React, { useMemo, useState } from 'react';
import {
  DollarSign, Calendar, Hash, Plus, X, Trash2, Smartphone, CreditCard, Wallet, Banknote, List,
  Clock, CheckCircle2, XCircle, ShieldCheck,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { type Estimate, type PaymentRecord } from '../../../../../services/estimates/estimates.types';
import { addPayment, deletePayment, reviewPayment } from '../../../../../services/estimates';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import type { ClientUser } from '../../../../../services/clients/client.auth';
import {
  createStripeIntent, createPaypalOrder, capturePaypalOrder, submitCashClaim,
} from '../../../../../services/estimates/estimates.clientPayments';
import {
  createPublicStripeIntent, createPublicPaypalOrder, capturePublicPaypalOrder, submitPublicCashClaim,
} from '../../../../../services/estimates/estimates.publicPayments';
import {
  getEntryAmount, getEntryPaidAmount, getEntryPendingAmount, getEntryPendingCashAmount, getEntryPendingGatewayAmount,
  getUnassignedPayments, getOverallBalance,
} from '../../../../../services/estimates/paymentSchedule.utils';
import type { PaymentScheduleEntry } from '../../../../../services/estimates/PaymentScheduleModal.types';

interface PaymentsTabProps {
  estimate: Estimate;
  onUpdate: () => void;
  /** Presence implies this is being rendered inside the client portal, not the contractor dashboard. */
  clientUser?: ClientUser | null;
  /** Unauthenticated public share-link view: show milestone balances but no pay/claim actions, unless publicToken is also set. */
  publicReadOnly?: boolean;
  /** Guest estimate's emailToken — when set alongside publicReadOnly, enables no-login payment actions via the public token endpoints. */
  publicToken?: string;
}

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (val: string | null | undefined): string => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

// ============================================================
// Status badge — shared by contractor ledger rows
// ============================================================

const StatusBadge: React.FC<{ status: PaymentRecord['status'] }> = ({ status }) => {
  const config: Record<PaymentRecord['status'], { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800', icon: <Clock className="w-3.5 h-3.5" /> },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    rejected: { label: 'Rejected', className: 'bg-gray-100 text-gray-500', icon: <XCircle className="w-3.5 h-3.5" /> },
  };
  const c = config[status];
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'Cash': return <Banknote className="w-4 h-4" />;
    case 'Card': return <CreditCard className="w-4 h-4" />;
    case 'Stripe': return <CreditCard className="w-4 h-4" />;
    case 'Online': return <Smartphone className="w-4 h-4" />;
    case 'PayPal': return <Smartphone className="w-4 h-4" />;
    case 'Check': return <Wallet className="w-4 h-4" />;
    default: return <List className="w-4 h-4" />;
  }
};

const getPaymentMethodBadge = (method: string) => {
  const methodColors: Record<string, string> = {
    Cash: 'bg-green-100 text-green-800',
    Check: 'bg-blue-100 text-blue-800',
    Card: 'bg-purple-100 text-purple-800',
    Stripe: 'bg-purple-100 text-purple-800',
    Online: 'bg-indigo-100 text-indigo-800',
    PayPal: 'bg-indigo-100 text-indigo-800',
    Other: 'bg-gray-100 text-gray-800',
  };
  const color = methodColors[method] || methodColors.Other;
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
      {getPaymentMethodIcon(method)}
      {method}
    </span>
  );
};

// ============================================================
// Client view — one payable "milestone" (schedule entry, or the whole
// balance when there's no schedule)
// ============================================================

interface Milestone {
  key: string;
  scheduleEntryId?: string;
  label: string;
  dueDate?: string;
  amount: number;
  paid: number;
  pending: number;
  pendingCash: number;
  pendingGateway: number;
}

const StripePaymentForm: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');
    const { error: confirmError } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="space-y-3">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" disabled={submitting}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !stripe}
          className="px-4 py-1.5 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? 'Processing…' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
};

const MilestoneCard: React.FC<{
  milestone: Milestone;
  estimateId: string;
  onUpdate: () => void;
  readOnly?: boolean;
  /** Guest emailToken — when set, payment actions go through the no-login public endpoints instead of the client-portal JWT ones. */
  publicToken?: string;
}> = ({ milestone, estimateId, onUpdate, readOnly = false, publicToken }) => {
  const remaining = milestone.amount - milestone.paid;
  const isPaid = remaining <= 0;
  const hasPendingClaim = milestone.pending > 0;

  const [activeAction, setActiveAction] = useState<'none' | 'stripe' | 'paypal' | 'cash'>('none');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [paypalPaymentId, setPaypalPaymentId] = useState<string | null>(null);
  const [cashAmount, setCashAmount] = useState(remaining > 0 ? remaining.toFixed(2) : '');
  const [cashNotes, setCashNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startStripe = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { clientSecret } = publicToken
        ? await createPublicStripeIntent(publicToken, { scheduleEntryId: milestone.scheduleEntryId })
        : await createStripeIntent(estimateId, { scheduleEntryId: milestone.scheduleEntryId });
      setStripeClientSecret(clientSecret);
      setActiveAction('stripe');
    } catch (err: any) {
      setError(err?.message || 'Could not start card payment');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCash = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (publicToken) {
        await submitPublicCashClaim(publicToken, { amount, scheduleEntryId: milestone.scheduleEntryId, notes: cashNotes.trim() || undefined });
      } else {
        await submitCashClaim(estimateId, { amount, scheduleEntryId: milestone.scheduleEntryId, notes: cashNotes.trim() || undefined });
      }
      setActiveAction('none');
      onUpdate();
    } catch (err: any) {
      setError(err?.message || 'Could not submit cash claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-900">{milestone.label}</h3>
          {milestone.dueDate && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5" /> Due {formatDate(milestone.dueDate)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">{formatCurrency(milestone.amount)}</p>
          {milestone.paid > 0 && (
            <p className="text-xs text-green-600 font-medium">{formatCurrency(milestone.paid)} paid</p>
          )}
        </div>
      </div>

      {isPaid ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4" /> Paid in full
        </div>
      ) : hasPendingClaim ? (
        <div className="mt-4 space-y-2">
          {milestone.pendingGateway > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4" /> {formatCurrency(milestone.pendingGateway)} processing — no action needed
            </div>
          )}
          {milestone.pendingCash > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4" /> {formatCurrency(milestone.pendingCash)} pending contractor approval
            </div>
          )}
        </div>
      ) : readOnly && !publicToken ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          {formatCurrency(remaining)} remaining — log in to your client portal to pay
        </div>
      ) : (
        <div className="mt-4">
          {activeAction === 'none' && (
            <div className="flex flex-wrap gap-2">
              {stripePublishableKey ? (
                <button
                  onClick={startStripe}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" /> Pay with Card
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                  <CreditCard className="w-4 h-4" /> Card payments not yet available
                </span>
              )}
              {paypalClientId ? (
                <button
                  onClick={() => setActiveAction('paypal')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Smartphone className="w-4 h-4" /> Pay with PayPal
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                  <Smartphone className="w-4 h-4" /> PayPal not yet available
                </span>
              )}
              <button
                onClick={() => setActiveAction('cash')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Banknote className="w-4 h-4" /> I Paid Cash
              </button>
            </div>
          )}

          {activeAction === 'stripe' && stripeClientSecret && stripePromise && (
            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                <StripePaymentForm
                  onSuccess={() => {
                    setActiveAction('none');
                    setStripeClientSecret(null);
                    onUpdate();
                  }}
                  onCancel={() => {
                    setActiveAction('none');
                    setStripeClientSecret(null);
                  }}
                />
              </Elements>
            </div>
          )}

          {activeAction === 'paypal' && paypalClientId && (
            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
                <PayPalButtons
                  style={{ layout: 'horizontal' }}
                  createOrder={async () => {
                    const { orderId, paymentId } = publicToken
                      ? await createPublicPaypalOrder(publicToken, { scheduleEntryId: milestone.scheduleEntryId })
                      : await createPaypalOrder(estimateId, { scheduleEntryId: milestone.scheduleEntryId });
                    setPaypalPaymentId(paymentId);
                    return orderId;
                  }}
                  onApprove={async (data) => {
                    if (!paypalPaymentId) return;
                    if (publicToken) {
                      await capturePublicPaypalOrder(publicToken, data.orderID, paypalPaymentId);
                    } else {
                      await capturePaypalOrder(estimateId, data.orderID, paypalPaymentId);
                    }
                    setActiveAction('none');
                    setPaypalPaymentId(null);
                    onUpdate();
                  }}
                  onCancel={() => setActiveAction('none')}
                  onError={() => setError('PayPal payment failed')}
                />
              </PayPalScriptProvider>
              <button onClick={() => setActiveAction('none')} className="mt-2 text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          )}

          {activeAction === 'cash' && (
            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={cashNotes}
                  onChange={(e) => setCashNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Paid in person on-site"
                />
              </div>
              <p className="text-xs text-gray-500">
                Your contractor will need to confirm this payment before it's reflected in your balance.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setActiveAction('none')} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={submitCash}
                  disabled={submitting}
                  className="px-4 py-1.5 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Client view — lists milestones (or a single full-balance card)
// ============================================================

const ClientPaymentsView: React.FC<{ estimate: Estimate; onUpdate: () => void; readOnly?: boolean; publicToken?: string }> = ({ estimate, onUpdate, readOnly = false, publicToken }) => {
  const payments = estimate.payments || [];
  const schedule = estimate.paymentSchedule;
  const estimateId = estimate.id!;

  const milestones: Milestone[] = useMemo(() => {
    if (schedule?.entries?.length) {
      return schedule.entries.map((entry: PaymentScheduleEntry) => ({
        key: entry.id,
        scheduleEntryId: entry.id,
        label: entry.description,
        dueDate: entry.dueDate,
        amount: getEntryAmount(entry, schedule, estimate.total),
        paid: getEntryPaidAmount(entry, payments),
        pending: getEntryPendingAmount(entry, payments),
        pendingCash: getEntryPendingCashAmount(entry, payments),
        pendingGateway: getEntryPendingGatewayAmount(entry, payments),
      }));
    }
    const balance = getOverallBalance(estimate.total, payments);
    const pendingPayments = payments.filter((p) => p.status === 'pending');
    return [
      {
        key: 'full-balance',
        label: 'Full Balance',
        amount: estimate.total,
        paid: estimate.total - balance,
        pending: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        pendingCash: pendingPayments.filter((p) => !p.stripePaymentIntentId && !p.paypalOrderId).reduce((sum, p) => sum + p.amount, 0),
        pendingGateway: pendingPayments.filter((p) => p.stripePaymentIntentId || p.paypalOrderId).reduce((sum, p) => sum + p.amount, 0),
      },
    ];
  }, [estimate, schedule, payments]);

  const unassigned = getUnassignedPayments(payments, schedule);
  const totalRemaining = getOverallBalance(estimate.total, payments);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
          <p className="text-sm text-gray-500">
            {schedule?.entries?.length ? 'Pay each milestone as it comes due.' : 'Pay your remaining balance.'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Balance Due</p>
          <p className={`text-xl font-bold ${totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {formatCurrency(Math.max(totalRemaining, 0))}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {milestones.map((m) => (
          <MilestoneCard key={m.key} milestone={m} estimateId={estimateId} onUpdate={onUpdate} readOnly={readOnly} publicToken={publicToken} />
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Other Payments</h3>
          <div className="space-y-2">
            {unassigned.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {getPaymentMethodBadge(p.method)}
                  <span className="text-gray-500">{formatDate(p.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Contractor view — existing ledger + pending-approval section
// ============================================================

const ContractorPaymentsView: React.FC<{ estimate: Estimate; onUpdate: () => void }> = ({ estimate, onUpdate }) => {
  const { currentUser, userProfile } = useAuthContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentRecord['method']>('Cash');
  const [notes, setNotes] = useState('');

  const payments = estimate.payments || [];
  const pendingCashClaims = payments.filter((p) => p.status === 'pending' && !p.stripePaymentIntentId && !p.paypalOrderId);
  const totalPaid = payments.filter((p) => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
  const currentBalance = estimate.total - totalPaid;

  const handleAddPayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!estimate.id) return;
    if (!currentUser) {
      setError('You must be logged in to record payments');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const userName = userProfile?.name || currentUser.email || 'Unknown User';
      await addPayment(estimate.id, {
        amount: paymentAmount,
        date,
        method,
        notes: notes.trim(),
        createdBy: userName,
      } as any);
      setAmount('');
      setNotes('');
      setShowAddForm(false);
      onUpdate();
    } catch (err) {
      console.error('Error adding payment:', err);
      setError('Failed to add payment record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!estimate.id || !window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await deletePayment(estimate.id, paymentId);
      onUpdate();
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Failed to delete payment');
    }
  };

  const handleReview = async (paymentId: string, decision: 'approve' | 'reject') => {
    if (!estimate.id) return;
    try {
      await reviewPayment(estimate.id, paymentId, decision);
      onUpdate();
    } catch (err) {
      console.error('Error reviewing payment:', err);
      setError('Failed to review payment');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Payment Records</h2>
              <p className="text-sm text-gray-500">Track all payments received for this estimate</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Current Balance</p>
              <p className={`text-2xl font-bold ${currentBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(currentBalance)}
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Payment
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {pendingCashClaims.length > 0 && (
          <div className="mb-8">
            <h3 className="flex items-center gap-2 font-semibold text-amber-800 mb-3">
              <ShieldCheck className="w-4 h-4" /> Pending Approval
            </h3>
            <div className="space-y-3">
              {pendingCashClaims.map((p) => (
                <div key={p.id} className="flex items-center justify-between border border-amber-200 bg-amber-50 rounded-xl p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{formatCurrency(p.amount)}</span>
                      {getPaymentMethodBadge(p.method)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Claimed by {p.createdBy} on {formatDate(p.createdAt)}
                    </p>
                    {p.notes && <p className="text-sm text-gray-600 mt-1">{p.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(p.id, 'reject')}
                      className="px-3 py-1.5 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(p.id, 'approve')}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="mb-8 p-6 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-orange-900">Record New Payment</h3>
              <button onClick={() => setShowAddForm(false)} className="text-orange-900 opacity-60 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-orange-800 mb-1">Amount Paid</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-orange-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-orange-800 mb-1">Date Paid</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-orange-800 mb-1">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online (Zelle, Cashapp, etc.)</option>
                  <option value="Check">Check</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-orange-800 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., Deposit for initial materials"
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                className="px-6 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
                disabled={isSubmitting || !amount}
              >
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments recorded yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Once payments are received for this estimate, record them here to keep track of the remaining balance.
            </p>
            <button onClick={() => setShowAddForm(true)} className="text-orange-600 hover:text-orange-700 font-semibold">
              Record your first payment →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {[...payments]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((payment, index) => {
                const isGatewayPending = payment.status === 'pending' && (payment.stripePaymentIntentId || payment.paypalOrderId);
                return (
                  <div
                    key={payment.id}
                    className="group border border-gray-200 rounded-xl p-5 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                            {formatCurrency(payment.amount)}
                          </div>
                          {getPaymentMethodBadge(payment.method)}
                          <StatusBadge status={payment.status} />
                          {isGatewayPending && <span className="text-xs text-gray-400">(awaiting confirmation)</span>}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{new Date(payment.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span>Payment {payments.length - index}</span>
                          </div>
                        </div>

                        {payment.notes && (
                          <p className="text-sm text-gray-600 bg-white/50 p-2 rounded-lg border border-gray-100">
                            {payment.notes}
                          </p>
                        )}

                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                          Recorded by {payment.createdBy} on {new Date(payment.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Estimate</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(estimate.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span className="font-medium">Total Paid</span>
                    <span className="font-bold">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-lg border-t pt-2 mt-2">
                    <span className="font-bold text-gray-900">Balance Due</span>
                    <span className={`font-black ${currentBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 font-mono tracking-tight uppercase">Overall Progress</span>
                    <span className="text-sm font-bold text-orange-600">{((totalPaid / estimate.total) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-1000 ease-out shadow-sm ${
                        currentBalance <= 0 ? 'bg-green-500' : 'bg-gradient-to-r from-orange-400 to-orange-600'
                      }`}
                      style={{ width: `${Math.min((totalPaid / estimate.total) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold tracking-widest">
                    {currentBalance <= 0 ? 'Paid in Full' : `${formatCurrency(currentBalance)} Remaining`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const PaymentsTab: React.FC<PaymentsTabProps> = ({ estimate, onUpdate, clientUser, publicReadOnly, publicToken }) => {
  const isClient = !!clientUser || !!publicReadOnly;

  if (isClient) {
    return (
      <ClientPaymentsView estimate={estimate} onUpdate={onUpdate} readOnly={!clientUser} publicToken={publicToken} />
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <ContractorPaymentsView estimate={estimate} onUpdate={onUpdate} />
    </div>
  );
};

export default PaymentsTab;
