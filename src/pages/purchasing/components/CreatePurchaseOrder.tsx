// src/pages/purchasing/components/CreatePurchaseOrder.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Package,
  FolderOpen,
  Trash2,
  Calendar,
  FileText,
  Search,
  ShoppingCart,
  List
} from 'lucide-react';
import { getAllEstimates } from '../../../services/estimates/estimates.queries';
import { createPurchaseOrder, updatePurchaseOrder } from '../../../services/purchasing/purchasing.mutations';
import type { EstimateWithId } from '../../../services/estimates';
import type { PurchaseOrderData, PurchaseOrderItem, PurchaseOrderWithId } from '../../../services/purchasing';
import { InventoryPickerModal } from '../../estimates/components/estimateDashboard/estimateTab/InventoryPickerModal';
import { CollectionImportModal } from '../../estimates/components/estimateDashboard/estimateTab/CollectionImportModal';
import ShoppingListTab from './ShoppingListTab';
import type { LineItem } from '../../../services/estimates';

interface CreatePurchaseOrderProps {
  onBack: () => void;
  onSuccess: () => void;
  editPO?: PurchaseOrderWithId;
}

const CreatePurchaseOrder: React.FC<CreatePurchaseOrderProps> = ({ onBack, onSuccess, editPO }) => {
  const [loading, setLoading] = useState(false);
  const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'shopping'>('items');

  // Form State
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>(editPO?.estimateId || '');
  const [orderDate, setOrderDate] = useState(editPO?.orderDate || new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(editPO?.expectedDeliveryDate || '');
  const [notes, setNotes] = useState(editPO?.notes || '');
  const [items, setItems] = useState<PurchaseOrderItem[]>(editPO?.items || []);
  const [taxRate, setTaxRate] = useState(editPO?.taxRate || 0);
  const [hasAddedItems, setHasAddedItems] = useState(false);

  // Load estimates on mount
  useEffect(() => {
    const loadEstimates = async () => {
      try {
        const data = await getAllEstimates();
        setEstimates(data);
      } catch (error) {
        console.error('Error loading estimates:', error);
      }
    };
    loadEstimates();
  }, []);

  // Update tax rate when estimate changes
  useEffect(() => {
    if (selectedEstimateId) {
      const estimate = estimates.find(e => e.id === selectedEstimateId);
      if (estimate) {
        setTaxRate(estimate.taxRate || 0);
      }
    }
  }, [selectedEstimateId, estimates]);

  const selectedEstimate = useMemo(() =>
    estimates.find(e => e.id === selectedEstimateId),
    [selectedEstimateId, estimates]
  );

  // Calculations
  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.totalCost, 0),
    [items]
  );

  const tax = useMemo(() =>
    subtotal * (taxRate / 100),
    [subtotal, taxRate]
  );

  const total = useMemo(() =>
    subtotal + tax,
    [subtotal, tax]
  );

  const handleAddInventoryItems = (lineItems: LineItem[]) => {
    const newPOItems: PurchaseOrderItem[] = lineItems.map(li => ({
      id: `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: li.productId || li.itemId,
      productName: li.description,
      sku: (li as any).sku,
      quantityNeeded: li.quantity,
      quantityOrdered: li.quantity,
      unitPrice: li.unitPrice,
      totalCost: li.quantity * li.unitPrice,
      quantityReceived: 0,
      isReceived: false,
    }));

    setItems(prev => [...prev, ...newPOItems]);
    setHasAddedItems(true);
  };

  const handleImportCollections = (lineItems: LineItem[]) => {
    const newPOItems: PurchaseOrderItem[] = lineItems.map(li => ({
      id: `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: li.productId || li.itemId,
      productName: li.description,
      sku: (li as any).sku,
      quantityNeeded: li.quantity,
      quantityOrdered: li.quantity,
      unitPrice: li.unitPrice,
      totalCost: li.quantity * li.unitPrice,
      quantityReceived: 0,
      isReceived: false,
    }));

    setItems(prev => [...prev, ...newPOItems]);
    setHasAddedItems(true);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<PurchaseOrderItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        updated.totalCost = updated.quantityOrdered * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one item to the purchase order.');
      return;
    }

    setLoading(true);
    try {
      const poData: Partial<PurchaseOrderData> = {
        estimateId: selectedEstimateId || '',
        estimateNumber: selectedEstimate?.estimateNumber || (editPO?.estimateNumber || 'Manual'),
        customerName: selectedEstimate?.customerName || (editPO?.customerName || 'Manual Customer'),
        status: (editPO && !hasAddedItems) ? editPO.status : 'pending',
        items: items.map(item => ({
          ...item,
          type: item.type || (item.productId ? 'product' : 'product') // Fallback logic
        })),
        orderDate: orderDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        subtotal,
        tax,
        taxRate,
        total,
        notes,
      };

      let result;
      if (editPO) {
        result = await updatePurchaseOrder(editPO.id, poData as any);
      } else {
        result = await createPurchaseOrder(poData as PurchaseOrderData);
      }

      if (result.success) {
        onSuccess();
      } else {
        alert(`Failed to ${editPO ? 'update' : 'create'} purchase order: ` + (result.error?.message || result.error));
      }
    } catch (error) {
      console.error(`Error ${editPO ? 'updating' : 'creating'} PO:`, error);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to {editPO ? 'Order' : 'Purchasing'}</span>
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || items.length === 0}
          className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
        >
          {loading ? (editPO ? 'Updating...' : 'Creating...') : (
            <>
              <Save className="w-5 h-5" />
              <span>{editPO ? 'Update Purchase Order' : 'Create Purchase Order'}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PO Details Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                {editPO ? `Editing ${editPO.poNumber}` : 'PO Details'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Estimate Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Estimate (Optional)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedEstimateId}
                    onChange={(e) => setSelectedEstimateId(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white"
                  >
                    <option value="">No Estimate linked</option>
                    {estimates.map(est => (
                      <option key={est.id} value={est.id}>
                        {est.estimateNumber} - {est.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Expected Delivery */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional details for this order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%) (Optional)
                </label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({taxRate}%):</span>
                <span className="text-gray-900 font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                <span className="text-gray-900">Total:</span>
                <span className="text-orange-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 bg-gray-50/50">
              <button
                onClick={() => setActiveTab('items')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'items'
                  ? 'border-b-2 border-orange-500 text-orange-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <List className="w-4 h-4" />
                Order Items ({items.length})
              </button>
              <button
                onClick={() => setActiveTab('shopping')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'shopping'
                  ? 'border-b-2 border-orange-500 text-orange-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Shopping List
              </button>
            </div>

            {activeTab === 'items' ? (
              <>
                <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    Items In This Order
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowInventoryModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Items
                    </button>
                    <button
                      onClick={() => setShowCollectionModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Import Collection
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Total</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                            No items added yet. Click 'Add Items' or 'Import Collection' to begin.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                              {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                value={item.quantityOrdered}
                                onChange={(e) => handleUpdateItem(item.id, { quantityOrdered: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-full pl-5 pr-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              ${item.totalCost.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-400 hover:text-red-600 transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-6">
                <ShoppingListTab
                  purchaseOrder={{
                    items: items,
                  } as any}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <InventoryPickerModal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        onAddItems={handleAddInventoryItems}
        allowedTypes={['product', 'tool', 'equipment']}
      />
      <CollectionImportModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        onImport={handleImportCollections}
      />
    </div>
  );
};

export default CreatePurchaseOrder;
