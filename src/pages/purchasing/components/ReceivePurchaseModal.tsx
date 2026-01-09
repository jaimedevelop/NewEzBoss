// src/pages/purchasing/components/ReceivePurchaseModal.tsx

import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import type { PurchaseOrderWithId, ReceiveItemData } from '../../../services/purchasing';
import { markPOAsReceived } from '../../../services/purchasing';

interface ReceivePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderWithId;
}

const ReceivePurchaseModal: React.FC<ReceivePurchaseModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
}) => {
  const [receivedItems, setReceivedItems] = useState<Map<string, ReceiveItemData>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleItemChange = (itemId: string, field: 'quantityReceived' | 'actualUnitPrice', value: number) => {
    const current = receivedItems.get(itemId) || {
      itemId,
      quantityReceived: 0,
      actualUnitPrice: purchaseOrder.items.find(i => i.id === itemId)?.unitPrice || 0,
    };

    setReceivedItems(new Map(receivedItems.set(itemId, { ...current, [field]: value })));
  };

  const handleSubmit = async () => {
    const itemsToReceive = Array.from(receivedItems.values()).filter(item => item.quantityReceived > 0);

    if (itemsToReceive.length === 0) {
      alert('Please enter quantities for items being received');
      return;
    }

    setSubmitting(true);
    const result = await markPOAsReceived(purchaseOrder.id!, itemsToReceive);
    setSubmitting(false);

    if (result.success) {
      alert('Purchase order updated successfully!');
      onClose();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Receive Purchase Order</h2>
              <p className="text-sm text-gray-500">{purchaseOrder.poNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-600 mb-4">
            Enter the quantity received and actual price paid for each item. You can receive items partially.
          </p>

          <div className="space-y-4">
            {purchaseOrder.items.filter(item => !item.notInInventory).map((item) => {
              const remainingQty = item.quantityOrdered - item.quantityReceived;
              const receivedData = receivedItems.get(item.id);

              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-gray-500">
                        Ordered: {item.quantityOrdered} | Already Received: {item.quantityReceived} | Remaining: {remainingQty}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity Received
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={remainingQty}
                        value={receivedData?.quantityReceived || 0}
                        onChange={(e) => handleItemChange(item.id, 'quantityReceived', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Actual Unit Price Paid
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={receivedData?.actualUnitPrice || item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'actualUnitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Receiving...' : 'Confirm Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceivePurchaseModal;
