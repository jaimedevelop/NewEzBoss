import React from 'react';
import { DollarSign, Calendar, Hash, TrendingDown } from 'lucide-react';
import { type Estimate } from '../../../../services/estimates/estimates.types';

interface PaymentsTabProps {
  estimate: Estimate;
  onUpdate: () => void;
}

// Mock payment data structure for display
// Later this will be fetched from Firebase using the estimate.payments IDs
interface Payment {
  id: string;
  paymentNumber: number; // Which payment in the schedule (e.g., 1, 2, 3)
  amount: number;
  paymentDate: string;
  paymentMethod?: 'cash' | 'check' | 'card' | 'transfer' | 'other';
  remainingBalance: number;
  notes?: string;
  createdBy: string;
}

const PaymentsTab: React.FC<PaymentsTabProps> = ({ estimate }) => {
  // Mock data - will be replaced with actual Firebase query
  // For now, just show an empty state or mock data based on estimate.payments
  const payments: Payment[] = [];

  const getPaymentMethodBadge = (method?: string) => {
    if (!method) return null;
    
    const methodColors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      check: 'bg-blue-100 text-blue-800',
      card: 'bg-purple-100 text-purple-800',
      transfer: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };

    const color = methodColors[method] || methodColors.other;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const currentBalance = estimate.total - totalPaid;

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
          
          {/* Payment Summary */}
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Current Balance</p>
            <p className={`text-2xl font-bold ${currentBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(currentBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(totalPaid)} of {formatCurrency(estimate.total)} paid
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {payments.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No payments recorded yet
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Once payments are received for this estimate, they will appear here. 
              Each payment will show the amount, date, payment number, and remaining balance.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Coming Soon:</strong> Payment recording functionality will be added when the payment system is implemented.
              </p>
            </div>
          </div>
        ) : (
          // Payments List
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">
                          Payment #{payment.paymentNumber}
                        </span>
                      </div>
                      {getPaymentMethodBadge(payment.paymentMethod)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(payment.paymentDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {payment.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-600 mb-1">
                      {formatCurrency(payment.amount)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingDown className="w-3 h-3" />
                      <span>Balance: {formatCurrency(payment.remainingBalance)}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar showing payment in context */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Payment Progress</span>
                    <span>
                      {((estimate.total - payment.remainingBalance) / estimate.total * 100).toFixed(1)}% paid
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${((estimate.total - payment.remainingBalance) / estimate.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Payment Summary */}
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Estimate Amount</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(estimate.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Paid ({payments.length} payment{payments.length !== 1 ? 's' : ''})</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
                  <span className="text-gray-900">Remaining Balance</span>
                  <span className={currentBalance > 0 ? 'text-orange-600' : 'text-green-600'}>
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Overall Payment Progress</span>
                  <span>{((totalPaid / estimate.total) * 100).toFixed(1)}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      currentBalance === 0 ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{
                      width: `${(totalPaid / estimate.total) * 100}%`
                    }}
                  />
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
