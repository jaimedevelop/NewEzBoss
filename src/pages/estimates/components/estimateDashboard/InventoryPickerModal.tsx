// src/pages/estimates/components/estimateDashboard/InventoryPickerModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Briefcase, Wrench, Truck, Search, Plus, Check } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { getProducts } from '../../../../services/inventory/products';
import { getLaborItems } from '../../../../services/inventory/labor';
import { getTools } from '../../../../services/inventory/tools';
import { getEquipment } from '../../../../services/inventory/equipment';
import { convertInventoryItemToLineItem } from '../../../../services/estimates/estimates.inventory';
import type { LineItem } from '../../../../services/estimates';

interface InventoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: LineItem[]) => void;
}

type InventoryType = 'product' | 'labor' | 'tool' | 'equipment';

export const InventoryPickerModal: React.FC<InventoryPickerModalProps> = ({
  isOpen,
  onClose,
  onAddItems
}) => {
  const { currentUser } = useAuthContext();
  const [selectedType, setSelectedType] = useState<InventoryType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<LineItem[]>([]);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  // Load items when type is selected
  useEffect(() => {
    if (!selectedType || !currentUser?.uid) return;

    const loadItems = async () => {
      setIsLoading(true);
      try {
        let result;
        switch (selectedType) {
          case 'product':
            // Products: getProducts(filters) - userId is part of filters
            result = await getProducts({ userId: currentUser.uid });
            break;
          case 'labor':
            // Labor: getLaborItems(userId, filters)
            result = await getLaborItems(currentUser.uid);
            break;
          case 'tool':
            // Tools: getTools(userId, filters) - userId is first param
            result = await getTools(currentUser.uid);
            break;
          case 'equipment':
            // Equipment: getEquipment(userId, filters) - userId is first param
            result = await getEquipment(currentUser.uid);
            break;
        }

        if (result?.success) {
          // Extract data based on response structure
          // Most services return { success: true, data: array }
          const data = Array.isArray(result.data) 
            ? result.data 
            : result.data?.laborItems || result.data?.products || [];
          setItems(data);
        } else {
          console.error(`Failed to load ${selectedType}s:`, result?.error);
          setItems([]);
        }
      } catch (error) {
        console.error('Error loading items:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [selectedType, currentUser?.uid]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
      setSearchTerm('');
      setItems([]);
      setAddedItems([]);
      setAddedItemIds(new Set());
    }
  }, [isOpen]);

  const handleTypeSelect = (type: InventoryType) => {
    setSelectedType(type);
    setSearchTerm('');
  };

  const handleAddItem = (item: any) => {
    if (!selectedType) return;
    
    // Convert to line item
    const lineItem = convertInventoryItemToLineItem(item, selectedType, 1);
    
    // Add to local state
    setAddedItems(prev => [...prev, lineItem]);
    setAddedItemIds(prev => new Set([...prev, item.id]));
    
    // Flash feedback (optional - could add visual indicator)
  };

  const handleDone = () => {
    if (addedItems.length > 0) {
      onAddItems(addedItems);
    }
    onClose();
  };

  const getTypeIcon = (type: InventoryType) => {
    switch (type) {
      case 'product': return Package;
      case 'labor': return Briefcase;
      case 'tool': return Wrench;
      case 'equipment': return Truck;
    }
  };

  // ✅ FIXED: Use predefined class objects instead of dynamic strings
  const getTypeClasses = (type: InventoryType) => {
    switch (type) {
      case 'product':
        return {
          border: 'hover:border-orange-500',
          bg: 'hover:bg-orange-50',
          icon: 'text-orange-600 group-hover:text-orange-700',
          text: 'text-orange-700'
        };
      case 'labor':
        return {
          border: 'hover:border-purple-500',
          bg: 'hover:bg-purple-50',
          icon: 'text-purple-600 group-hover:text-purple-700',
          text: 'text-purple-700'
        };
      case 'tool':
        return {
          border: 'hover:border-blue-500',
          bg: 'hover:bg-blue-50',
          icon: 'text-blue-600 group-hover:text-blue-700',
          text: 'text-blue-700'
        };
      case 'equipment':
        return {
          border: 'hover:border-green-500',
          bg: 'hover:bg-green-50',
          icon: 'text-green-600 group-hover:text-green-700',
          text: 'text-green-700'
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Add From Inventory</h2>
            {addedItems.length > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {addedItems.length} added
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedType ? (
            // Type selection
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">Select inventory type to search:</p>
              <div className="grid grid-cols-2 gap-4">
                {(['product', 'labor', 'tool', 'equipment'] as InventoryType[]).map(type => {
                  const Icon = getTypeIcon(type);
                  const classes = getTypeClasses(type);
                  return (
                    <button
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className={`p-6 border-2 rounded-lg transition-all flex flex-col items-center gap-3 group ${classes.border} ${classes.bg}`}
                    >
                      <Icon className={`h-12 w-12 ${classes.icon}`} />
                      <span className={`text-lg font-medium capitalize ${classes.text}`}>
                        {type === 'product' ? 'Products' : type === 'labor' ? 'Labor' : type === 'tool' ? 'Tools' : 'Equipment'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Search and results
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                ← Back to type selection
              </button>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${selectedType}s...`}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Results */}
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  Loading items...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'No items found matching your search' : 'No items available'}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredItems.slice(0, 20).map(item => {
                    const isAdded = addedItemIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description}</div>
                          )}
                          {item.sku && (
                            <div className="text-xs text-gray-400 mt-1">SKU: {item.sku}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddItem(item)}
                          disabled={isAdded}
                          className={`ml-4 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            isAdded
                              ? 'bg-green-100 text-green-700 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-4 w-4" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                  {filteredItems.length > 20 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Showing first 20 results. Refine your search to see more.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={addedItems.length === 0}
            className={`px-6 py-2 rounded-lg font-medium ${
              addedItems.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Done ({addedItems.length})
          </button>
        </div>
      </div>
    </div>
  );
};