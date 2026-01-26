// src/pages/purchasing/components/PurchaseOrderModal.tsx

import React, { useState } from 'react';
import { X, ExternalLink, Truck, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PurchaseOrderWithId } from '../../../services/purchasing';
import { updatePOStatus, cancelPurchaseOrder, getPurchaseOrderById } from '../../../services/purchasing';
import PurchaseOrderStatusBadge from './PurchaseOrderStatusBadge';
import PurchaseOrderItemsTable from './PurchaseOrderItemsTable';
import ShoppingListTab from './ShoppingListTab';
import ReceivePurchaseModal from './ReceivePurchaseModal';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (po: PurchaseOrderWithId) => void;
  purchaseOrder: PurchaseOrderWithId;
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  purchaseOrder: initialPO,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'items' | 'details' | 'shopping'>('items');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(initialPO);

  if (!isOpen) return null;

  const handleMarkAsOrdered = async () => {
    if (confirm('Mark this purchase order as ordered?')) {
      const result = await updatePOStatus(purchaseOrder.id!, 'ordered');
      if (result.success) {
        setPurchaseOrder({ ...purchaseOrder, status: 'ordered' });
      }
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Enter cancellation reason (optional):');
    if (reason !== null) {
      const result = await cancelPurchaseOrder(purchaseOrder.id!, reason || undefined);
      if (result.success) {
        setPurchaseOrder({ ...purchaseOrder, status: 'cancelled', cancellationReason: reason });
      }
    }
  };

  const canMarkAsOrdered = purchaseOrder.status === 'pending';
  const canReceive = purchaseOrder.status === 'ordered' || purchaseOrder.status === 'partially-received';
  const canCancel = purchaseOrder.status === 'pending' || purchaseOrder.status === 'ordered';

  const refreshPOData = async () => {
    if (purchaseOrder.id) {
      const result = await getPurchaseOrderById(purchaseOrder.id);
      if (result.success && result.data) {
        setPurchaseOrder(result.data);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{purchaseOrder.poNumber}</h2>
                <PurchaseOrderStatusBadge status={purchaseOrder.status} />
              </div>
              <button
                onClick={() => navigate(`/estimates/${purchaseOrder.estimateId}`)}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                From Estimate {purchaseOrder.estimateNumber}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 px-6 pt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('items')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'items'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Items ({purchaseOrder.items.length})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'shopping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              Shopping List
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'items' && (
              <PurchaseOrderItemsTable items={purchaseOrder.items} />
            )}

            {activeTab === 'shopping' && (
              <ShoppingListTab purchaseOrder={purchaseOrder} />
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                    <div className="text-gray-900">{purchaseOrder.orderDate}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                    <div className="text-gray-900">{purchaseOrder.expectedDeliveryDate || 'Not set'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <div className="text-gray-900">{purchaseOrder.supplier || 'Mixed/Not specified'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                    <div className="text-gray-900">{purchaseOrder.receivedDate || 'Not received'}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <div className="text-gray-900 bg-gray-50 rounded-lg p-3">
                    {purchaseOrder.notes || 'No notes'}
                  </div>
                </div>

                {purchaseOrder.cancellationReason && (
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Cancellation Reason</label>
                    <div className="text-red-900 bg-red-50 rounded-lg p-3">
                      {purchaseOrder.cancellationReason}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Subtotal</div>
                      <div className="text-lg font-medium text-gray-900">
                        ${purchaseOrder.subtotal.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Tax ({purchaseOrder.taxRate}%)</div>
                      <div className="text-lg font-medium text-gray-900">
                        ${purchaseOrder.tax.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-2 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${purchaseOrder.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => onEdit(purchaseOrder)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit P.O.
            </button>

            {canMarkAsOrdered && (
              <button
                onClick={handleMarkAsOrdered}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Truck className="w-4 h-4" />
                Mark as Ordered
              </button>
            )}

            {canReceive && (
              <button
                onClick={() => setShowReceiveModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Received
              </button>
            )}

            {canCancel && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4" />
                Cancel P.O.
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <ReceivePurchaseModal
          isOpen={showReceiveModal}
          onClose={() => {
            setShowReceiveModal(false);
          }}
          onSuccess={refreshPOData}
          purchaseOrder={purchaseOrder}
        />
      )}
    </>
  );
};

export default PurchaseOrderModal;
