import React, { useState } from 'react';
import { DollarSign, Calendar, Hash, Plus, X, Trash2, Smartphone, CreditCard, Wallet, Banknote, List } from 'lucide-react';
import { type Estimate, type PaymentRecord } from '../../../../../services/estimates/estimates.types';
import { addPayment, deletePayment } from '../../../../../services/estimates';
import { useAuthContext } from '../../../../../contexts/AuthContext';

interface PaymentsTabProps {
  estimate: Estimate;
  onUpdate: () => void;
}

const PaymentsTab: React.FC<PaymentsTabProps> = ({ estimate, onUpdate }) => {
  const { currentUser, userProfile } = useAuthContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentRecord['method']>('Cash');
  const [notes, setNotes] = useState('');

  const payments = estimate.payments || [];

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cash': return <Banknote className="w-4 h-4" />;
      case 'Card': return <CreditCard className="w-4 h-4" />;
      case 'Online': return <Smartphone className="w-4 h-4" />;
      case 'Check': return <Wallet className="w-4 h-4" />;
      default: return <List className="w-4 h-4" />;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodColors: Record<string, string> = {
      Cash: 'bg-green-100 text-green-800',
      Check: 'bg-blue-100 text-blue-800',
      Card: 'bg-purple-100 text-purple-800',
      Online: 'bg-indigo-100 text-indigo-800',
      Other: 'bg-gray-100 text-gray-800'
    };

    const color = methodColors[method] || methodColors.Other;

    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
        {getPaymentMethodIcon(method)}
        {method}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalPaid = payments.reduce((sum: number, payment: PaymentRecord) => sum + payment.amount, 0);
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
        createdBy: userName
      });

      // Reset form
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Payment Records</h2>
              <p className="text-sm text-gray-500">
                Track all payments received for this estimate
              </p>
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
        {/* Add Payment Form */}
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

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No payments recorded yet
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Once payments are received for this estimate, record them here to keep track of the remaining balance.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-orange-600 hover:text-orange-700 font-semibold"
            >
              Record your first payment →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.sort((a: PaymentRecord, b: PaymentRecord) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((payment: PaymentRecord, index: number) => (
              <div
                key={payment.id}
                className="group border border-gray-200 rounded-xl p-5 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                        {formatCurrency(payment.amount)}
                      </div>
                      {getPaymentMethodBadge(payment.method)}
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
            ))}

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
                      className={`h-full transition-all duration-1000 ease-out shadow-sm ${currentBalance <= 0 ? 'bg-green-500' : 'bg-gradient-to-r from-orange-400 to-orange-600'
                        }`}
                      style={{
                        width: `${Math.min((totalPaid / estimate.total) * 100, 100)}%`
                      }}
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
    </div>
  );
};

export default PaymentsTab;
