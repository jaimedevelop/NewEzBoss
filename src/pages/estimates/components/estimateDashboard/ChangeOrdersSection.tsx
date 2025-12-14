import React, { useState } from 'react';
import { FileEdit, Plus, TrendingUp, TrendingDown, Check, X, Clock } from 'lucide-react';

interface ChangeOrdersSectionProps {
  estimate: {
    estimateNumber: string;
    changeOrders?: string[];
    total: number;
  };
  onUpdate: () => void;
}

// Mock change order data structure (will be from Firebase in real implementation)
interface ChangeOrder {
  id: string;
  changeOrderNumber: string;
  description: string;
  reason: string;
  category: string;
  priceImpact: number;
  timeImpact: number;
  status: 'draft' | 'pending-approval' | 'approved' | 'rejected';
  requestedDate: string;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
}

const ChangeOrdersSection: React.FC<ChangeOrdersSectionProps> = ({ estimate, onUpdate }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Mock data - in real implementation, fetch from Firebase using estimate.changeOrders IDs
  const changeOrders: ChangeOrder[] = [
    // {
    //   id: 'co1',
    //   changeOrderNumber: 'CO-2025-001',
    //   description: 'Upgrade to premium faucets',
    //   reason: 'Customer requested upgrade',
    //   category: 'customer-request',
    //   priceImpact: 750,
    //   timeImpact: 0,
    //   status: 'approved',
    //   requestedDate: '2025-01-10',
    //   approvedBy: 'John Smith',
    //   approvalDate: '2025-01-11'
    // }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Draft</span>;
      case 'pending-approval':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" />
          Approved
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center gap-1">
          <X className="w-3 h-3" />
          Rejected
        </span>;
      default:
        return null;
    }
  };

  const totalImpact = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + co.priceImpact, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Change Orders</h2>
            {changeOrders.length > 0 && (
              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {changeOrders.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Change Order
          </button>
        </div>
      </div>

      <div className="p-6">
        {changeOrders.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileEdit className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No change orders yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Track estimate modifications and get customer approval
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Change Order
            </button>
          </div>
        ) : (
          // Change orders list
          <div className="space-y-4">
            {/* Summary Card */}
            {totalImpact !== 0 && (
              <div className={`p-4 rounded-lg border ${
                totalImpact > 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {totalImpact > 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      totalImpact > 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      Total Approved Changes
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${
                    totalImpact > 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {totalImpact > 0 ? '+' : ''}${totalImpact.toFixed(2)}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${
                  totalImpact > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  New total: ${(estimate.total + totalImpact).toFixed(2)}
                </p>
              </div>
            )}

            {/* Change Orders */}
            {changeOrders.map((co) => (
              <div
                key={co.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {co.changeOrderNumber}
                      </h3>
                      {getStatusBadge(co.status)}
                    </div>
                    <p className="text-sm text-gray-700">{co.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      co.priceImpact > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {co.priceImpact > 0 ? '+' : ''}${co.priceImpact.toFixed(2)}
                    </p>
                    {co.timeImpact !== 0 && (
                      <p className="text-xs text-gray-500">
                        {co.timeImpact > 0 ? '+' : ''}{co.timeImpact} days
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div>
                    <span className="font-medium">{co.category.replace('-', ' ')}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(co.requestedDate).toLocaleDateString()}</span>
                  </div>
                  {co.status === 'approved' && co.approvedBy && (
                    <span>Approved by {co.approvedBy}</span>
                  )}
                  {co.status === 'rejected' && (
                    <span className="text-red-600">Rejected</span>
                  )}
                </div>

                {/* Action buttons for pending */}
                {co.status === 'pending-approval' && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                    <button className="flex-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Form Modal Placeholder */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create Change Order</h3>
              <p className="text-sm text-gray-600 mb-4">
                Change order creation form will be implemented here
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg">
                  Create Change Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeOrdersSection;