// src/pages/purchasing/components/ReceivePurchaseModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Package, Store as StoreIcon } from 'lucide-react';
import type { PurchaseOrderWithId, ReceiveItemData } from '../../../services/purchasing';
import { markPOAsReceived } from '../../../services/purchasing';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getStores, addStore, Store } from '../../../services/inventory/products/stores';
import HierarchicalSelect from '../../../mainComponents/forms/HierarchicalSelect';
import { Alert } from '../../../mainComponents/ui/Alert';

interface ReceivePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  purchaseOrder: PurchaseOrderWithId;
}

interface LocalReceiveItemData {
  itemId: string;
  quantityReceived: number | string;
  actualUnitPrice: number | string;
  // Store override support
  useDifferentStore?: boolean;
  selectedStore?: string;
}

const ReceivePurchaseModal: React.FC<ReceivePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
}) => {
  const { currentUser } = useAuthContext();
  const [receivedItems, setReceivedItems] = useState<Map<string, LocalReceiveItemData>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-hide banner after 3 seconds
  useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => {
        setBanner(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [banner]);

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
              // If it's a new store, we'll set it as the value and the user can 'add' it via HierarchicalSelect
              setSelectedStore(purchaseOrder.supplier);
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
    };

    setReceivedItems(new Map(receivedItems.set(itemId, { ...current, [field]: value })));
  };

  // Helper to handle store changes specifically since HierarchicalSelect returns the name directly
  const handleItemStoreChange = (itemId: string, value: string) => {
    const current = receivedItems.get(itemId) || {
      itemId,
      quantityReceived: '',
      actualUnitPrice: purchaseOrder.items.find(i => i.id === itemId)?.unitPrice || '',
      useDifferentStore: true,
      selectedStore: '',
    };

    setReceivedItems(new Map(receivedItems.set(itemId, { ...current, selectedStore: value })));
  };

  const handleAddNewStore = async (storeName: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await addStore(storeName, currentUser.uid);

      if (result.success) {
        const newStore: Store = { id: result.id, name: storeName, userId: currentUser.uid };
        setStores(prev => [...prev, newStore].sort((a, b) => a.name.localeCompare(b.name)));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to add store' };
      }
    } catch (error) {
      console.error('Error adding new store:', error);
      return { success: false, error: 'Failed to add store' };
    }
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
          actualUnitPrice: price,
          receivedStore: item.useDifferentStore ? item.selectedStore : undefined
        });
      }
    });

    if (itemsToReceive.length === 0) {
      alert('Please enter quantities for items being received');
      return;
    }

    setSubmitting(true);

    // Use selected store
    const storeToUse = selectedStore;

    const result = await markPOAsReceived(purchaseOrder.id!, itemsToReceive, storeToUse);
    setSubmitting(false);

    if (result.success) {
      alert('Purchase order updated successfully!');
      if (onSuccess) onSuccess();
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
          {banner && (
            <div className="mb-4">
              <Alert 
                type={banner.type} 
                message={banner.message} 
                onClose={() => setBanner(null)} 
              />
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Enter the quantity received and actual price paid for each item. You can receive items partially.
            </p>
            <button
              onClick={() => {
                const newItems = new Map(receivedItems);
                purchaseOrder.items.forEach(item => {
                  const remaining = item.quantityOrdered - item.quantityReceived;
                  if (remaining > 0) {
                    const current = newItems.get(item.id) || {
                      itemId: item.id,
                      quantityReceived: remaining,
                      actualUnitPrice: item.actualUnitPrice || item.unitPrice,
                      useDifferentStore: false,
                      selectedStore: '',
                    };
                    newItems.set(item.id, { ...current, quantityReceived: remaining });
                  }
                });
                setReceivedItems(newItems);
                setBanner({ type: 'success', message: 'All remaining items added to receipt!' });
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Receive All Remaining
            </button>
          </div>

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
                <HierarchicalSelect
                  value={selectedStore}
                  onChange={setSelectedStore}
                  options={stores.map(s => ({ value: s.name, label: s.name }))}
                  placeholder="Select a store..."
                  onAddNew={handleAddNewStore}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {purchaseOrder.items.map((item) => {
              const remainingQty = item.quantityOrdered - item.quantityReceived;
              if (remainingQty <= 0) return null;

              const receivedData = receivedItems.get(item.id);

              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.productName}</span>
                        {item.notInInventory && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase rounded">
                            Non-Inventory
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Ordered: {item.quantityOrdered} | Already Received: {item.quantityReceived} | <span className="text-blue-600 font-medium">Remaining: {remainingQty}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleItemChange(item.id, 'quantityReceived', remainingQty);
                        setBanner({ type: 'success', message: `${item.productName} added to receipt!` });
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded"
                    >
                      Receive All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Qty Received
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
                          Unit Price Paid
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={receivedData?.actualUnitPrice ?? item.actualUnitPrice ?? item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'actualUnitPrice', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id={`store-override-${item.id}`}
                          checked={receivedData?.useDifferentStore || false}
                          onChange={(e) => handleItemChange(item.id, 'useDifferentStore', e.target.checked)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor={`store-override-${item.id}`} className="text-sm text-gray-700 cursor-pointer">
                          Receive to different store
                        </label>
                      </div>

                      {receivedData?.useDifferentStore && (
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                          <HierarchicalSelect
                            value={receivedData.selectedStore || ''}
                            onChange={(value) => handleItemStoreChange(item.id, value)}
                            options={stores.map(s => ({ value: s.name, label: s.name }))}
                            placeholder="Select a store..."
                            onAddNew={handleAddNewStore}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {purchaseOrder.items.every(item => item.quantityReceived >= item.quantityOrdered) && (
              <div className="text-center py-8 text-gray-500 italic">
                All items have been fully received.
              </div>
            )}
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
