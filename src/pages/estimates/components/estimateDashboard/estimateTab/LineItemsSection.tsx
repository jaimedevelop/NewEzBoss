import React, { useState, useMemo } from 'react';
import { Package, Edit, Trash2, Plus, Check, X, Loader2, Flag, ShoppingCart, AlertCircle, FolderOpen, Lock, Save } from 'lucide-react';

import { useAuthContext } from '../../../../../contexts/AuthContext';
import {
  addLineItem,
  updateLineItem,
  deleteLineItem,
  formatCurrency,
  findDuplicateLineItems,
  type LineItem,
  type Estimate
} from '../../../../../services/estimates';
import { InventoryPickerModal } from './InventoryPickerModal';

interface LineItemsSectionProps {
  estimate: Estimate;
  onUpdate: () => void;
  onImportCollection: () => void;
  isParentEditing?: boolean; // Optional: allows parent to control edit mode
  onSave?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  isSaving?: boolean;
}

const LineItemsSection: React.FC<LineItemsSectionProps> = ({
  estimate,
  onUpdate,
  onImportCollection,
  isParentEditing,
  onSave,
  onCancel,
  onEdit,
  isSaving = false
}) => {
  const { currentUser } = useAuthContext();

  // Determine if line items are locked
  const isLineItemsLocked = estimate.clientState === 'accepted' || estimate.estimateState === 'invoice';

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  // Batch delete state
  const [isBatchDeleteMode, setIsBatchDeleteMode] = useState(false);
  const [selectedItemsForDeletion, setSelectedItemsForDeletion] = useState<Set<string>>(new Set());

  // Inventory picker modal state
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);

  // Form states
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
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Effective edit mode: use parent's edit state if provided, otherwise use internal state
  // But always disable if locked
  const effectiveEditMode = isLineItemsLocked ? false : (isParentEditing !== undefined ? isParentEditing : isEditing);

  // Find duplicate line items
  const duplicateLineItemIds = useMemo(() => {
    return findDuplicateLineItems(estimate.lineItems || []);
  }, [estimate.lineItems]);

  // Check if any items are being edited
  const hasActiveEdits = editingItemId !== null || isAddingNew;

  // ============================================================================
  // HANDLERS - Edit Mode Toggle with Warning
  // ============================================================================

  const handleToggleEditMode = () => {
    if (onEdit) {
      onEdit();
      return;
    }

    if (isEditing && hasActiveEdits) {
      // Show warning if trying to exit while editing
      setShowExitWarning(true);
    } else {
      // Safe to toggle
      setIsEditing(!isEditing);
      // Reset batch delete state when exiting edit mode
      if (isEditing) {
        setIsBatchDeleteMode(false);
        setSelectedItemsForDeletion(new Set());
      }
    }
  };

  const handleConfirmExit = () => {
    // User confirmed - reset all editing states and exit
    setEditingItemId(null);
    setIsAddingNew(false);
    setEditForm({});
    setNewItemForm({
      description: '',
      quantity: '1',
      unitPrice: '0'
    });
    setError(null); // Clear any error messages
    setIsEditing(false);
    setShowExitWarning(false);
    // Reset batch delete state
    setIsBatchDeleteMode(false);
    setSelectedItemsForDeletion(new Set());
  };

  const handleCancelExit = () => {
    // User wants to keep editing
    setShowExitWarning(false);
  };

  // ============================================================================
  // HANDLERS - Add Items From Inventory
  // ============================================================================

  const handleAddItemsFromInventory = async (newItems: LineItem[]) => {
    if (!currentUser || !estimate.id || newItems.length === 0) return;

    setIsAddingItem(true);
    setError(null);

    try {
      for (const item of newItems) {
        const result = await addLineItem(
          estimate.id,
          {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            type: item.type,
            itemId: item.itemId,
            notes: item.notes
          },
          currentUser.uid,
          currentUser.displayName || 'Unknown User'
        );

        if (!result.success) {
          console.error('Failed to add item:', item.description);
        }
      }

      onUpdate();
    } catch (err) {
      console.error('Error adding items from inventory:', err);
      setError('Failed to add some items. Please try again.');
    } finally {
      setIsAddingItem(false);
    }
  };

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
        onUpdate();
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
  // HANDLERS - Batch Delete
  // ============================================================================

  const handleToggleBatchDeleteMode = () => {
    setIsBatchDeleteMode(!isBatchDeleteMode);
    setSelectedItemsForDeletion(new Set());
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemsForDeletion(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleBatchDelete = async () => {
    if (!currentUser || !estimate.id || selectedItemsForDeletion.size === 0) return;

    // Capture the selected items before any state changes
    const itemsToDelete = Array.from(selectedItemsForDeletion);

    const confirmed = window.confirm(
      `Are you sure you want to delete ${itemsToDelete.length} item${itemsToDelete.length > 1 ? 's' : ''}?`
    );

    if (!confirmed) return;

    setError(null);

    try {
      // Delete items SEQUENTIALLY to avoid race conditions
      // Each deletion needs to read the updated state before proceeding
      let failedCount = 0;

      for (const itemId of itemsToDelete) {
        const result = await deleteLineItem(
          estimate.id!,
          itemId,
          currentUser.uid,
          currentUser.displayName || 'Unknown User'
        );

        if (!result.success) {
          failedCount++;
          console.error(`Failed to delete item ${itemId}:`, result.error);
        }
      }

      if (failedCount > 0) {
        setError(`Failed to delete ${failedCount} item(s)`);
      }

      // Clear selection and exit batch delete mode
      setSelectedItemsForDeletion(new Set());
      setIsBatchDeleteMode(false);

      onUpdate();
    } catch (err) {
      console.error('Error batch deleting items:', err);
      setError('Failed to delete items');
    }
  };

  // ============================================================================
  // HANDLERS - Add New Item Manually
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

    if (!newItemForm.description.trim()) {
      setError('Description is required');
      return;
    }

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
          unitPrice: unitPrice,
          total: quantity * unitPrice,
          type: 'custom'
        },
        currentUser.uid,
        currentUser.displayName || 'Unknown User'
      );

      if (result.success) {
        // Reset form but keep adding mode active
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
  // RENDER HELPERS
  // ============================================================================

  const renderActionButtons = () => {
    if (isLineItemsLocked) return null;

    if (effectiveEditMode) {
      if (onSave && onCancel) {
        // Parent controlled edit mode buttons
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Estimate'}
            </button>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        );
      }
      // Fallback or internal edit mode (legacy/standalone usage)
      return (
        <button
          onClick={handleToggleEditMode}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          Done Editing
        </button>
      );
    }

    // Not in edit mode
    return (
      <button
        onClick={handleToggleEditMode}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
      >
        <Edit className="w-4 h-4" />
        Edit Estimate
      </button>
    );
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
            <Package className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {estimate.lineItems?.length || 0} items
            </span>
          </div>
          {renderActionButtons()}
        </div>
      </div>

      <div className="p-6">
        {/* Lock Warning */}
        {isLineItemsLocked && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Line Items Locked</h4>
                <p className="text-sm text-amber-800">
                  {estimate.estimateState === 'invoice'
                    ? 'Line items cannot be edited on invoices. Invoices are final records.'
                    : 'Line items are locked because this estimate has been accepted. To make changes, create a change order from the header actions.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Batch Delete Mode Banner */}
        {isBatchDeleteMode && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">
                  Select items to delete ({selectedItemsForDeletion.size} selected)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedItemsForDeletion.size === 0}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Delete Items {selectedItemsForDeletion.size > 0 && `(${selectedItemsForDeletion.size})`}
                </button>
                <button
                  onClick={handleToggleBatchDeleteMode}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exit Warning Modal */}
        {showExitWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Unsaved Changes
                  </h3>
                </div>

                <p className="text-gray-600 mb-6">
                  You are currently editing items. If you exit now, any unsaved changes will be lost. Are you sure you want to continue?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelExit}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    No, Continue Editing
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Yes, Lose Progress
                  </button>
                </div>
              </div>
            </div>
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
                {effectiveEditMode && <th className="pb-3 w-24"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimate.lineItems?.map((item) => {
                const isDuplicate = duplicateLineItemIds.has(item.id);

                return (
                  <tr key={item.id} className="text-sm">
                    <td className="py-3">
                      {editingItemId === item.id ? (
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {isDuplicate && (
                            <div title="Duplicate item detected">
                              <Flag
                                className="w-4 h-4 text-red-500 flex-shrink-0"
                              />
                            </div>
                          )}
                          <span className="text-gray-900">{item.description}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      {editingItemId === item.id ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editForm.quantity || ''}
                          onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                          className="w-full px-2 py-1 text-sm text-right border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-gray-700">{item.quantity}</span>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      {editingItemId === item.id ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editForm.unitPrice || ''}
                          onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                          className="w-full px-2 py-1 text-sm text-right border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="text-gray-700">{formatCurrency(item.unitPrice)}</span>
                      )}
                    </td>

                    <td className="py-3 text-right font-medium text-gray-900">
                      {editingItemId === item.id
                        ? formatCurrency(
                          (parseFloat(editForm.quantity || '0') || 0) *
                          (parseFloat(editForm.unitPrice || '0') || 0)
                        )
                        : formatCurrency(item.total)
                      }
                    </td>

                    {effectiveEditMode && (
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isBatchDeleteMode ? (
                            // Show checkbox in batch delete mode
                            <input
                              type="checkbox"
                              checked={selectedItemsForDeletion.has(item.id)}
                              onChange={() => handleToggleItemSelection(item.id)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                              title="Select for deletion"
                            />
                          ) : editingItemId === item.id ? (
                            // Show save/cancel when editing
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
                            // Show edit/delete buttons normally
                            <>
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="text-gray-400 hover:text-orange-600 p-1"
                                title="Edit item"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleToggleBatchDeleteMode}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Delete items"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {isAddingNew && (
                <tr className="text-sm bg-orange-50">
                  <td className="py-3">
                    <input
                      type="text"
                      value={newItemForm.description}
                      onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                      placeholder="Description"
                      className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                      className="w-full px-2 py-1 text-sm text-right border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newItemForm.unitPrice}
                      onChange={(e) => setNewItemForm({ ...newItemForm, unitPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-sm text-right border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
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

        {effectiveEditMode && !isAddingNew && (
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleAddNew}
              className="py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>

            <button
              onClick={() => setShowInventoryPicker(true)}
              className="py-2 border-2 border-dashed border-green-300 rounded-lg text-sm text-green-700 hover:border-green-500 hover:text-green-800 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Add From Inventory
            </button>

            <button
              onClick={onImportCollection}
              className="py-2 border-2 border-dashed border-indigo-300 rounded-lg text-sm text-indigo-700 hover:border-indigo-500 hover:text-indigo-800 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Import Collection
            </button>
          </div>
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
            <div className="flex justify-between mb-4">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(estimate.total)}
              </span>
            </div>

            {/* Action buttons footer */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </div>

      <InventoryPickerModal
        isOpen={showInventoryPicker}
        onClose={() => setShowInventoryPicker(false)}
        onAddItems={handleAddItemsFromInventory}
      />
    </div>
  );
};

export default LineItemsSection;