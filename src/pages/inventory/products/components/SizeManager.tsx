import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, XCircle, Check, ArrowLeft, Search } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
  getProductTrades,
  getProductSizes,
  addProductSize,
  updateProductSizeName,
  deleteProductSize,
  getSizeUsageCount
} from '../../../../services/categories';
import { type ProductTrade, type ProductSize } from '../../../../services/categories/types';

interface SizeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSizeUpdated: () => void;
  onBack?: () => void;
}

const SizeManager: React.FC<SizeManagerProps> = ({
  isOpen,
  onClose,
  onSizeUpdated,
  onBack
}) => {
  const { currentUser } = useAuthContext();
  
  // Trade state
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [loadingTrades, setLoadingTrades] = useState(true);
  
  // Size state
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create/Edit state
  const [isCreating, setIsCreating] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    sizeId: string;
    sizeName: string;
    usageCount: number;
  }>({
    isOpen: false,
    sizeId: '',
    sizeName: '',
    usageCount: 0
  });

  // Load trades on mount
  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      loadTrades();
    }
  }, [isOpen, currentUser?.uid]);

  // Load sizes when trade selection changes
  useEffect(() => {
    if (selectedTradeId && currentUser?.uid) {
      loadSizes();
    } else {
      setSizes([]);
    }
  }, [selectedTradeId, currentUser?.uid]);

  const loadTrades = async () => {
    if (!currentUser?.uid) return;
    
    setLoadingTrades(true);
    try {
      const result = await getProductTrades(currentUser.uid);
      if (result.success && result.data) {
        setTrades(result.data);
        // Auto-select first trade if available
        if (result.data.length > 0 && !selectedTradeId) {
          setSelectedTradeId(result.data[0].id!);
        }
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoadingTrades(false);
    }
  };

  const loadSizes = async () => {
    if (!currentUser?.uid || !selectedTradeId) return;
    
    setLoadingSizes(true);
    try {
      const result = await getProductSizes(currentUser.uid, selectedTradeId);
      if (result.success && result.data) {
        setSizes(result.data);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
    } finally {
      setLoadingSizes(false);
    }
  };

  const startCreate = () => {
    setIsCreating(true);
    setCreateValue('');
    setCreateError('');
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setCreateValue('');
    setCreateError('');
  };

  const saveCreate = async () => {
    if (!currentUser?.uid || !selectedTradeId || isSaving) return;

    const trimmedValue = createValue.trim();
    
    if (!trimmedValue) {
      setCreateError('Size name cannot be empty');
      return;
    }

    if (trimmedValue.length > 30) {
      setCreateError('Size name must be 30 characters or less');
      return;
    }

    // Client-side duplicate check (optimistic)
    const isDuplicate = sizes.some(
      size => size.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    
    if (isDuplicate) {
      setCreateError('A size with this name already exists in this trade');
      return;
    }

    setIsSaving(true);
    
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tradeName = trades.find(t => t.id === selectedTradeId)?.name || '';
    
    // OPTIMISTIC UPDATE: Add to UI immediately
    const newSize: ProductSize = {
      id: tempId,
      name: trimmedValue,
      tradeId: tradeName,
      userId: currentUser.uid
    };
    
    const previousSizes = [...sizes];
    setSizes([...sizes, newSize].sort((a, b) => a.name.localeCompare(b.name)));
    setCreateValue('');
    setCreateError('');
    setIsCreating(false);

    try {
      // Background sync with database
      const result = await addProductSize(
        trimmedValue,
        selectedTradeId,
        currentUser.uid
      );

      if (result.success && result.id) {
        // Replace temp ID with real ID from database
        setSizes(prevSizes => 
          prevSizes.map(s => s.id === tempId ? { ...s, id: result.id } : s)
        );
        onSizeUpdated(); // Notify parent component
      } else {
        // ROLLBACK: Remove optimistic update on failure
        setSizes(previousSizes);
        setCreateError(result.error || 'Failed to create size');
        setIsCreating(true); // Reopen form with error
        setCreateValue(trimmedValue); // Restore value
      }
    } catch (error) {
      // ROLLBACK: Remove optimistic update on error
      console.error('Error creating size:', error);
      setSizes(previousSizes);
      setCreateError('An error occurred while creating the size');
      setIsCreating(true);
      setCreateValue(trimmedValue);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (size: ProductSize) => {
    setEditingId(size.id!);
    setEditValue(size.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (sizeId: string) => {
    if (!currentUser?.uid || !selectedTradeId || !editValue.trim()) {
      cancelEdit();
      return;
    }

    const trimmedValue = editValue.trim();
    
    // Client-side duplicate check (optimistic)
    const isDuplicate = sizes.some(
      size => size.id !== sizeId && 
              size.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    
    if (isDuplicate) {
      alert('A size with this name already exists in this trade');
      return;
    }

    // Store previous state for rollback
    const previousSizes = [...sizes];
    const previousName = sizes.find(s => s.id === sizeId)?.name || '';
    
    // OPTIMISTIC UPDATE: Update UI immediately
    setSizes(prevSizes => 
      prevSizes.map(s => 
        s.id === sizeId ? { ...s, name: trimmedValue } : s
      ).sort((a, b) => a.name.localeCompare(b.name))
    );
    cancelEdit();

    try {
      // Background sync with database
      const result = await updateProductSizeName(
        sizeId,
        trimmedValue,
        selectedTradeId,
        currentUser.uid
      );

      if (result.success) {
        onSizeUpdated(); // Notify parent component
      } else {
        // ROLLBACK: Restore previous state on failure
        setSizes(previousSizes);
        alert(result.error || 'Failed to update size');
        // Reopen edit mode with original value
        setEditingId(sizeId);
        setEditValue(previousName);
      }
    } catch (error) {
      // ROLLBACK: Restore previous state on error
      console.error('Error updating size:', error);
      setSizes(previousSizes);
      alert('An error occurred while updating the size');
      setEditingId(sizeId);
      setEditValue(previousName);
    }
  };

  const initiateDelete = async (size: ProductSize) => {
    if (!currentUser?.uid) return;

    try {
      const usageResult = await getSizeUsageCount(size.name, currentUser.uid);
      
      setDeleteConfirm({
        isOpen: true,
        sizeId: size.id!,
        sizeName: size.name,
        usageCount: usageResult.success && usageResult.data ? usageResult.data : 0
      });
    } catch (error) {
      console.error('Error checking size usage:', error);
      alert('An error occurred while checking size usage');
    }
  };

  const confirmDelete = async () => {
    if (!currentUser?.uid) return;

    const sizeId = deleteConfirm.sizeId;
    const sizeName = deleteConfirm.sizeName;
    
    // Store previous state for rollback
    const previousSizes = [...sizes];
    
    // Close modal immediately for better UX
    setDeleteConfirm({ isOpen: false, sizeId: '', sizeName: '', usageCount: 0 });
    
    // OPTIMISTIC UPDATE: Remove from UI immediately
    setSizes(prevSizes => prevSizes.filter(s => s.id !== sizeId));

    try {
      // Background sync with database
      const result = await deleteProductSize(sizeId, currentUser.uid);

      if (result.success) {
        onSizeUpdated(); // Notify parent component
      } else {
        // ROLLBACK: Restore deleted item on failure
        setSizes(previousSizes);
        alert(result.error || 'Failed to delete size');
      }
    } catch (error) {
      // ROLLBACK: Restore deleted item on error
      console.error('Error deleting size:', error);
      setSizes(previousSizes);
      alert('An error occurred while deleting the size');
    }
  };

  const filteredSizes = sizes.filter(size =>
    size.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  const selectedTrade = trades.find(t => t.id === selectedTradeId);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-black bg-opacity-50" 
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-xl shadow-2xl w-full mx-4 max-h-[90vh] flex flex-col" style={{ maxWidth: '1200px' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Manage Sizes</h2>
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-orange-600 hover:text-orange-700 rounded-lg p-2 hover:bg-orange-50 transition-colors"
                  title="Back to Utilities"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Trades */}
            <div className="w-80 border-r bg-gray-50 flex flex-col">
              <div className="p-4 border-b bg-white">
                <h3 className="font-semibold text-gray-900">Select Trade</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingTrades ? (
                  <div className="text-center py-8 text-gray-500">Loading trades...</div>
                ) : trades.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No trades found. Create trades in the Category Manager first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trades.map(trade => {
                      const sizeCount = sizes.filter(s => s.tradeId === trade.name).length;
                      return (
                        <button
                          key={trade.id}
                          onClick={() => setSelectedTradeId(trade.id!)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            selectedTradeId === trade.id
                              ? 'bg-orange-600 text-white'
                              : 'bg-white hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="font-medium">{trade.name}</div>
                          {selectedTradeId === trade.id && (
                            <div className="text-sm text-orange-100 mt-1">
                              {sizeCount} {sizeCount === 1 ? 'size' : 'sizes'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Sizes */}
            <div className="flex-1 flex flex-col">
              {!selectedTradeId ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a trade to manage its sizes
                </div>
              ) : (
                <>
                  {/* Search and Add */}
                  <div className="p-4 border-b bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        Sizes for {selectedTrade?.name}
                      </h3>
                      <button
                        onClick={startCreate}
                        disabled={isCreating}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400"
                      >
                        <Plus className="h-4 w-4" />
                        Add Size
                      </button>
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search sizes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Size List */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {loadingSizes ? (
                      <div className="text-center py-8 text-gray-500">Loading sizes...</div>
                    ) : (
                      <div className="space-y-2">
                        {/* Create Form */}
                        {isCreating && (
                          <div className="flex items-center gap-2 p-3 border-2 border-dashed border-orange-400 bg-orange-50 rounded-lg">
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={createValue}
                                onChange={(e) => {
                                  setCreateValue(e.target.value);
                                  setCreateError('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCreate();
                                  if (e.key === 'Escape') cancelCreate();
                                }}
                                placeholder="Enter size name..."
                                maxLength={30}
                                className="flex-1 px-3 py-2 border border-orange-500 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                autoFocus
                                disabled={isSaving}
                              />
                              
                              <div className="flex items-center gap-1">
                                {createError ? (
                                  <span className="text-xs text-red-600 mr-2">{createError}</span>
                                ) : isSaving ? (
                                  <span className="text-xs text-gray-500">Saving...</span>
                                ) : (
                                  <span className="text-xs text-gray-500">{createValue.length}/30</span>
                                )}
                                
                                <button
                                  onClick={saveCreate}
                                  disabled={!createValue.trim() || isSaving}
                                  className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-100 disabled:text-gray-400 disabled:hover:bg-transparent"
                                  title="Save"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelCreate}
                                  disabled={isSaving}
                                  className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-100 disabled:text-gray-400"
                                  title="Cancel"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Size Items */}
                        {filteredSizes.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            {searchTerm ? 'No sizes match your search' : 'No sizes yet. Click "Add Size" to get started.'}
                          </div>
                        ) : (
                          filteredSizes.map(size => (
                            <div
                              key={size.id}
                              className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 group"
                            >
                              {editingId === size.id ? (
                                <>
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(size.id!);
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    className="flex-1 px-3 py-2 border border-orange-500 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveEdit(size.id!)}
                                    className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-100"
                                    title="Save"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                                    title="Cancel"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 font-medium text-gray-800">{size.name}</span>
                                  
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                    <button
                                      onClick={() => startEdit(size)}
                                      className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                                      title="Edit"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => initiateDelete(size)}
                                      className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Click <Edit2 className="h-3 w-3 inline" /> to edit or <Trash2 className="h-3 w-3 inline" /> to delete
              </div>
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50" 
            onClick={() => setDeleteConfirm({ isOpen: false, sizeId: '', sizeName: '', usageCount: 0 })}
          />
          
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h3>
            
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete the size <strong>"{deleteConfirm.sizeName}"</strong>?
            </p>
            
            {deleteConfirm.usageCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This size is currently used by {deleteConfirm.usageCount} {deleteConfirm.usageCount === 1 ? 'product' : 'products'}. 
                  You must reassign or delete those products first.
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, sizeId: '', sizeName: '', usageCount: 0 })}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirm.usageCount > 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SizeManager;
