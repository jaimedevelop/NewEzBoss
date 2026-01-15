// src/pages/purchasing/components/ReceivePurchaseModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Package, Store as StoreIcon } from 'lucide-react';
import type { PurchaseOrderWithId, ReceiveItemData } from '../../../services/purchasing';
import { markPOAsReceived } from '../../../services/purchasing';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getStores, Store } from '../../../services/inventory/products/stores';

interface ReceivePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderWithId;
}

interface LocalReceiveItemData {
  itemId: string;
  quantityReceived: number | string;
  actualUnitPrice: number | string;
  // Store override support
  useDifferentStore?: boolean;
  selectedStore?: string;
  customStore?: string;
  isCustomStore?: boolean;
}

const ReceivePurchaseModal: React.FC<ReceivePurchaseModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
}) => {
  const { currentUser } = useAuthContext();
  const [receivedItems, setReceivedItems] = useState<Map<string, LocalReceiveItemData>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  // Store selection
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [customStore, setCustomStore] = useState<string>('');
  const [isCustomStore, setIsCustomStore] = useState(false);

  useEffect(() => {
    const loadStores = async () => {
      if (currentUser?.uid) {
        const result = await getStores(currentUser.uid);
        if (result.success && result.data) {
          setStores(result.data);

          // Try to match PO supplier with existing store
          if (purchaseOrder.supplier) {
            const matchingStore = result.data.find(s => s.name.toLowerCase() === purchaseOrder.supplier?.toLowerCase());
            if (matchingStore) {
              setSelectedStore(matchingStore.name);
            } else {
              // If supplier doesn't match a store, set as custom or just leave for user to decide
              // For now, let's default to custom if it's not empty
              setIsCustomStore(true);
              setCustomStore(purchaseOrder.supplier);
            }
          }
        }
      }
    };
    loadStores();
  }, [currentUser, purchaseOrder.supplier]);

  if (!isOpen) return null;

  /* 
   * Generic handler for item changes.
   * NOTE: For complex nested fields like store selection, we might create separate handlers 
   * or expand this one. Let's expand this one to support the new fields.
   */
  const handleItemChange = (itemId: string, field: keyof LocalReceiveItemData, value: any) => {
    const current = receivedItems.get(itemId) || {
      itemId,
      quantityReceived: '',
      actualUnitPrice: purchaseOrder.items.find(i => i.id === itemId)?.unitPrice || '',
      useDifferentStore: false,
      selectedStore: '',
      customStore: '',
      isCustomStore: false,
    };

    setReceivedItems(new Map(receivedItems.set(itemId, { ...current, [field]: value })));
  };

  // Helper to handle store changes specifically since they involve multiple fields logic sometimes (like custom vs selected)
  const handleItemStoreChange = (itemId: string, type: 'selection' | 'custom' | 'toggle_custom', value: string | boolean) => {
    const current = receivedItems.get(itemId) || {
      itemId,
      quantityReceived: '',
      actualUnitPrice: purchaseOrder.items.find(i => i.id === itemId)?.unitPrice || '',
      useDifferentStore: true,
      selectedStore: '',
      customStore: '',
      isCustomStore: false,
    };

    let updates: Partial<LocalReceiveItemData> = {};

    if (type === 'selection') {
      const val = value as string;
      if (val === 'custom') {
        updates = { isCustomStore: true, selectedStore: '' };
      } else {
        updates = { isCustomStore: false, selectedStore: val };
      }
    } else if (type === 'custom') {
      updates = { customStore: value as string };
    } else if (type === 'toggle_custom') {
      updates = { isCustomStore: value as boolean };
    }

    setReceivedItems(new Map(receivedItems.set(itemId, { ...current, ...updates })));
  };

  const handleSubmit = async () => {
    const itemsToReceive: ReceiveItemData[] = [];

    receivedItems.forEach((item) => {
      const qty = item.quantityReceived === '' ? 0 : Number(item.quantityReceived);
      const price = item.actualUnitPrice === '' ? 0 : Number(item.actualUnitPrice);

      if (qty > 0) {
        itemsToReceive.push({
          itemId: item.itemId,
          quantityReceived: qty,
          actualUnitPrice: price
        });
      }
    });

    if (itemsToReceive.length === 0) {
      alert('Please enter quantities for items being received');
      return;
    }

    setSubmitting(true);

    // Use selected store or custom store
    const storeToUse = isCustomStore ? customStore : selectedStore;

    const result = await markPOAsReceived(purchaseOrder.id!, itemsToReceive, storeToUse);
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

          {/* Store Selection */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <StoreIcon className="w-5 h-5 text-gray-700" />
              <h3 className="font-medium text-gray-900">Received From</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store / Supplier
                </label>
                <select
                  value={isCustomStore ? 'custom' : selectedStore}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setIsCustomStore(true);
                      setSelectedStore('');
                    } else {
                      setIsCustomStore(false);
                      setSelectedStore(val);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="">Select a store...</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.name}>
                      {store.name}
                    </option>
                  ))}
                  <option value="custom">Other (Enter Manually)</option>
                </select>
              </div>

              {isCustomStore && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={customStore}
                    onChange={(e) => setCustomStore(e.target.value)}
                    placeholder="Enter store name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}
            </div>
          </div>

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
                        placeholder="0"
                        value={receivedData?.quantityReceived ?? ''}
                        onChange={(e) => handleItemChange(item.id, 'quantityReceived', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder:text-gray-400"
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
                        placeholder="0.00"
                        value={receivedData?.actualUnitPrice ?? item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'actualUnitPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder:text-gray-400"
                      />
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id={`store-override-${item.id}`}
                            checked={receivedData?.useDifferentStore || false}
                            onChange={(e) => handleItemChange(item.id, 'useDifferentStore', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <label htmlFor={`store-override-${item.id}`} className="text-sm text-gray-700 cursor-pointer">
                            Different Store
                          </label>
                        </div>

                        {receivedData?.useDifferentStore && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Select Store
                              </label>
                              <select
                                value={receivedData.isCustomStore ? 'custom' : receivedData.selectedStore || ''}
                                onChange={(e) => handleItemStoreChange(item.id, 'selection', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white"
                              >
                                <option value="">Select a store...</option>
                                {stores.map(store => (
                                  <option key={store.id} value={store.name}>
                                    {store.name}
                                  </option>
                                ))}
                                <option value="custom">Other (Enter Manually)</option>
                              </select>
                            </div>

                            {receivedData.isCustomStore && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Store Name
                                </label>
                                <input
                                  type="text"
                                  value={receivedData.customStore || ''}
                                  onChange={(e) => handleItemStoreChange(item.id, 'custom', e.target.value)}
                                  placeholder="Enter store name"
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
