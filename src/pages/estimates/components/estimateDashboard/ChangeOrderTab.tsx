import React, { useState, useEffect } from 'react';
import { FileEdit, Plus, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type Estimate } from '../../../../services/estimates/estimates.types';
import { getChangeOrdersByParent } from '../../../../services/estimates';

interface ChangeOrderTabProps {
  estimate: Estimate;
  onUpdate: () => void;
}

const ChangeOrderTab: React.FC<ChangeOrderTabProps> = ({ estimate }) => {
  const navigate = useNavigate();
  const [changeOrders, setChangeOrders] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChangeOrders();
  }, [estimate.id]);

  const loadChangeOrders = async () => {
    if (!estimate.id) return;
    
    setLoading(true);
    try {
      const orders = await getChangeOrdersByParent(estimate.id);
      setChangeOrders(orders);
    } catch (error) {
      console.error('Error loading change orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChangeOrder = () => {
    if (!estimate.id) {
      console.error('Cannot create change order: estimate ID is missing');
      return;
    }
    console.log('Creating change order for estimate (from ChangeOrderTab):', estimate.id);
    navigate(`/estimates/new?mode=change-order&parent=${estimate.id}`);
  };

  const handleChangeOrderClick = (changeOrderId: string) => {
    navigate(`/estimates/${changeOrderId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Draft</span>;
      case 'sent':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Sent</span>;
      case 'accepted':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepted</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Orders</h2>
              <p className="text-sm text-gray-500">
                Modifications and additions to the original estimate
              </p>
            </div>
          </div>
          <button
            onClick={handleNewChangeOrder}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Change Order
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Loading change orders...</p>
          </div>
        ) : changeOrders.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileEdit className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No change orders yet
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Once this estimate is accepted, any changes or additions will be tracked as change orders. 
              Each change order becomes its own estimate for client approval.
            </p>
            <button
              onClick={handleNewChangeOrder}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Change Order
            </button>
          </div>
        ) : (
          // Change Orders List
          <div className="space-y-4">
            {changeOrders.map((changeOrder) => (
              <div
                key={changeOrder.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleChangeOrderClick(changeOrder.id!)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {changeOrder.estimateNumber}
                      </h3>
                      {getStatusBadge(changeOrder.clientState || 'draft')}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {changeOrder.lineItems.length} line item(s)
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(changeOrder.total)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{changeOrder.createdDate || 'N/A'}</span>
                  </div>
                  {changeOrder.createdBy && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{changeOrder.createdBy}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Total Change Orders ({changeOrders.length})
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(changeOrders.reduce((sum, co) => sum + co.total, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeOrderTab;
