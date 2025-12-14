// src/pages/estimates/components/estimateDashboard/LineItemsSection.tsx

import React, { useState } from 'react';
import { Package, Edit, Trash2, Plus, Check, X, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { 
  addLineItem, 
  updateLineItem, 
  deleteLineItem,
  formatCurrency,
  type LineItem,
  type Estimate 
} from '../../../../services/estimates';

interface LineItemsSectionProps {
  estimate: Estimate;
  onUpdate: () => void;
}

const LineItemsSection: React.FC<LineItemsSectionProps> = ({ estimate, onUpdate }) => {
  const { currentUser } = useAuthContext();
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Form states (using strings for number inputs to allow empty values)
  const [editForm, setEditForm] = useState<{
    description?: string;
    quantity?: string;
    unitPrice?: string;
  }>({});
  const [newItemForm, setNewItemForm] = useState({
    description: '',
    quantity: '1',
    unitPrice: '0'
  });
  
  // Loading states
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // ============================================================================
  // HANDLERS - Edit Existing Item
  // ============================================================================
  
  const handleStartEdit = (item: LineItem) => {
    setEditingItemId(item.id);
    setEditForm({
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString()
    });
  };
  
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm({});
  };
  
  const handleSaveEdit = async (itemId: string) => {
    if (!currentUser || !estimate.id) return;
    
    setSavingItemId(itemId);
    setError(null);
    
    try {
      // Parse string values, defaulting empty to 0
      const quantity = editForm.quantity?.trim() ? parseFloat(editForm.quantity) : 0;
      const unitPrice = editForm.unitPrice?.trim() ? parseFloat(editForm.unitPrice) : 0;
      
      const result = await updateLineItem(
        estimate.id,
        itemId,
        {
          description: editForm.description,
          quantity: quantity,
          unitPrice: unitPrice
        },
        currentUser.uid,
        currentUser.displayName || 'Unknown User'
      );
      
      if (result.success) {
        setEditingItemId(null);
        setEditForm({});
        onUpdate(); // Refresh estimate data
      } else {
        setError(result.error || 'Failed to update line item');
      }
    } catch (err) {
      console.error('Error saving edit:', err);
      setError('Failed to update line item');
    } finally {
      setSavingItemId(null);
    }
  };
  
  // ============================================================================
  // HANDLERS - Delete Item
  // ============================================================================
  
  const handleDelete = async (itemId: string, description: string) => {
    if (!currentUser || !estimate.id) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${description}"?`
    );
    
    if (!confirmed) return;
    
    setDeletingItemId(itemId);
    setError(null);
    
    try {
      const result = await deleteLineItem(
        estimate.id,
        itemId,
        currentUser.uid,
        currentUser.displayName || 'Unknown User'
      );
      
      if (result.success) {
        onUpdate();
      } else {
        setError(result.error || 'Failed to delete line item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete line item');
    } finally {
      setDeletingItemId(null);
    }
  };
  
  // ============================================================================
  // HANDLERS - Add New Item
  // ============================================================================
  
  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewItemForm({
      description: '',
      quantity: '1',
      unitPrice: '0'
    });
  };
  
  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewItemForm({
      description: '',
      quantity: '1',
      unitPrice: '0'
    });
  };
  
  const handleSaveNew = async () => {
    if (!currentUser || !estimate.id) return;
    
    // Validation
    if (!newItemForm.description.trim()) {
      setError('Description is required');
      return;
    }
    
    // Parse values, defaulting empty to 0
    const quantity = newItemForm.quantity.trim() ? parseFloat(newItemForm.quantity) : 0;
    const unitPrice = newItemForm.unitPrice.trim() ? parseFloat(newItemForm.unitPrice) : 0;
    
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    
    if (unitPrice < 0) {
      setError('Unit price cannot be negative');
      return;
    }
    
    setIsAddingItem(true);
    setError(null);
    
    try {
      const result = await addLineItem(
        estimate.id,
        {
          description: newItemForm.description,
          quantity: quantity,
          unitPrice: unitPrice
        },
        currentUser.uid,
        currentUser.displayName || 'Unknown User'
      );
      
      if (result.success) {
        setIsAddingNew(false);
        setNewItemForm({
          description: '',
          quantity: '1',
          unitPrice: '0'
        });
        onUpdate();
      } else {
        setError(result.error || 'Failed to add line item');
      }
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add line item');
    } finally {
      setIsAddingItem(false);
    }
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {estimate.lineItems?.length || 0} items
            </span>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            {isEditing ? 'Done Editing' : 'Edit Items'}
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
        
        {/* Line Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="pb-3">Description</th>
                <th className="pb-3 text-right w-20">Qty</th>
                <th className="pb-3 text-right w-28">Unit Price</th>
                <th className="pb-3 text-right w-28">Total</th>
                {isEditing && <th className="pb-3 w-24"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimate.lineItems?.map((item) => (
                <tr key={item.id} className="text-sm">
                  {/* Description */}
                  <td className="py-3">
                    {editingItemId === item.id ? (
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-900">{item.description}</span>
                    )}
                  </td>
                  
                  {/* Quantity */}
                  <td className="py-3 text-right">
                    {editingItemId === item.id ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.quantity || ''}
                        onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                        className="w-full px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    ) : (
                      <span className="text-gray-700">{item.quantity}</span>
                    )}
                  </td>
                  
                  {/* Unit Price */}
                  <td className="py-3 text-right">
                    {editingItemId === item.id ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.unitPrice || ''}
                        onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                        className="w-full px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="text-gray-700">{formatCurrency(item.unitPrice)}</span>
                    )}
                  </td>
                  
                  {/* Total */}
                  <td className="py-3 text-right font-medium text-gray-900">
                    {editingItemId === item.id
                      ? formatCurrency(
                          (parseFloat(editForm.quantity || '0') || 0) * 
                          (parseFloat(editForm.unitPrice || '0') || 0)
                        )
                      : formatCurrency(item.total)
                    }
                  </td>
                  
                  {/* Actions */}
                  {isEditing && (
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editingItemId === item.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={savingItemId === item.id}
                              className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                              title="Save"
                            >
                              {savingItemId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="text-gray-400 hover:text-blue-600 p-1"
                              title="Edit item"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.description)}
                              disabled={deletingItemId === item.id}
                              className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                              title="Delete item"
                            >
                              {deletingItemId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              
              {/* Add New Item Row */}
              {isAddingNew && (
                <tr className="text-sm bg-blue-50">
                  <td className="py-3">
                    <input
                      type="text"
                      value={newItemForm.description}
                      onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                      placeholder="Description"
                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newItemForm.quantity}
                      onChange={(e) => setNewItemForm({ ...newItemForm, quantity: e.target.value })}
                      placeholder="0"
                      className="w-full px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newItemForm.unitPrice}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unitPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">
                    {formatCurrency(
                      (parseFloat(newItemForm.quantity) || 0) * 
                      (parseFloat(newItemForm.unitPrice) || 0)
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleSaveNew}
                        disabled={isAddingItem}
                        className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                        title="Save"
                      >
                        {isAddingItem ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={handleCancelAdd}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Item Button */}
        {isEditing && !isAddingNew && (
          <button 
            onClick={handleAddNew}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Line Item
          </button>
        )}

        {/* Calculations */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(estimate.subtotal)}
            </span>
          </div>
          
          {estimate.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Discount {estimate.discountType === 'percentage' ? `(${estimate.discount}%)` : ''}
              </span>
              <span className="font-medium text-red-600">
                -{formatCurrency(
                  estimate.discountType === 'percentage' 
                    ? estimate.subtotal * (estimate.discount / 100)
                    : estimate.discount
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Tax ({estimate.taxRate}%)
            </span>
            <span className="font-medium text-gray-900">
              {formatCurrency(estimate.tax)}
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(estimate.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineItemsSection;