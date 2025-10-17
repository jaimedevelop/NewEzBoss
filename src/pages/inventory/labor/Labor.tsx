// src/pages/labor/Labor.tsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getLaborItems, deleteLaborItem, type LaborItem } from '../../../services/inventory/labor';
import { LaborHeader } from './components/LaborHeader';
import LaborFilter, { type LaborFilterState } from './components/LaborFilter';
import { LaborTable } from './components/LaborTable';
import { LaborCreationModal } from './components/LaborCreationModal';
import { Alert } from '../../../mainComponents/ui/Alert';

export const Labor: React.FC = () => {
  const { currentUser } = useAuthContext();
  
  // State
  const [items, setItems] = useState<LaborItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LaborItem | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  
  // Filter state - FIXED to match LaborFilterState interface
  const [filterState, setFilterState] = useState<LaborFilterState>({
    searchTerm: '',
    tradeId: '',        // Changed from 'trade' to 'tradeId'
    sectionId: '',      // Changed from 'section' to 'sectionId'
    categoryId: '',     // Changed from 'category' to 'categoryId'
    pricingType: '',
    sortBy: 'name'
  });

  // Load all labor items on mount
  useEffect(() => {
    const loadItems = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await getLaborItems(currentUser.uid);
        if (result.success && result.data) {
          setItems(result.data.laborItems);
        } else {
          setError(result.error || 'Failed to load labor items');
          setItems([]);
        }
      } catch (err) {
        console.error('Error loading labor items:', err);
        setError('An error occurred while loading labor items');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [currentUser?.uid]);

  // Filter items based on filter state - FIXED to use IDs
  const getFilteredItems = (items: LaborItem[], filters: LaborFilterState): LaborItem[] => {
    return items.filter(item => {
      // Search term - searches name, description, and cached hierarchy names
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(searchLower);
        const matchesDesc = item.description?.toLowerCase().includes(searchLower);
        const matchesTrade = item.tradeName?.toLowerCase().includes(searchLower);
        const matchesSection = item.sectionName?.toLowerCase().includes(searchLower);
        const matchesCategory = item.categoryName?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesDesc && !matchesTrade && !matchesSection && !matchesCategory) {
          return false;
        }
      }
      
      // Hierarchy filters - FIXED to filter by IDs
      if (filters.tradeId && item.tradeId !== filters.tradeId) return false;
      if (filters.sectionId && item.sectionId !== filters.sectionId) return false;
      if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
      
      // Pricing type filter
      if (filters.pricingType === 'flat-rate' && (!item.flatRates || item.flatRates.length === 0)) {
        return false;
      }
      if (filters.pricingType === 'hourly' && (!item.hourlyRates || item.hourlyRates.length === 0)) {
        return false;
      }
      if (filters.pricingType === 'tasks' && (!item.tasks || item.tasks.length === 0)) {
        return false;
      }
      
      return true;
    });
  };

  // Sort items based on sort field - FIXED to use cached names
  const getSortedItems = (items: LaborItem[], sortBy: string): LaborItem[] => {
    const sorted = [...items];
    
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'tradeName':  // Changed from 'trade'
        return sorted.sort((a, b) => (a.tradeName || '').localeCompare(b.tradeName || ''));
      case 'sectionName':  // Changed from 'section'
        return sorted.sort((a, b) => (a.sectionName || '').localeCompare(b.sectionName || ''));
      case 'categoryName':  // Changed from 'category'
        return sorted.sort((a, b) => (a.categoryName || '').localeCompare(b.categoryName || ''));
      case 'createdAt':
        return sorted.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
          return bDate - aDate; // Newest first
        });
      default:
        return sorted;
    }
  };

  // Apply filters and sorting
  const filteredItems = getFilteredItems(items, filterState);
  const displayItems = getSortedItems(filteredItems, filterState.sortBy);

  // Handlers
  const handleAddNew = () => {
    setEditingItem(null);
    setViewOnly(false);
    setShowModal(true);
  };

  const handleView = (item: LaborItem) => {
    setEditingItem(item);
    setViewOnly(true);
    setShowModal(true);
  };

  const handleEdit = (item: LaborItem) => {
    setEditingItem(item);
    setViewOnly(false);
    setShowModal(true);
  };

  const handleDuplicate = (item: LaborItem) => {
    // Extract base name (remove any existing "(n)" suffix)
    const baseNameMatch = item.name.match(/^(.+?)(?:\s*\((\d+)\))?$/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : item.name;
    
    // Find all items with names starting with the base name
    const relatedItems = items.filter(i => {
      const match = i.name.match(/^(.+?)(?:\s*\((\d+)\))?$/);
      const iBaseName = match ? match[1].trim() : i.name;
      return iBaseName === baseName;
    });
    
    // Extract existing copy numbers
    const copyNumbers = relatedItems
      .map(i => {
        const match = i.name.match(/\((\d+)\)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    // Find next available copy number
    const nextCopyNumber = copyNumbers.length > 0 ? Math.max(...copyNumbers) + 1 : 1;
    
    // Create duplicate with new name
    const duplicatedItem: LaborItem = {
      ...item,
      id: undefined, // Remove ID so it creates new item
      name: `${baseName} (${nextCopyNumber})`,
      createdAt: undefined,
      updatedAt: undefined
    };
    
    setEditingItem(duplicatedItem);
    setViewOnly(false);
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this labor item? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await deleteLaborItem(itemId);
      if (result.success) {
        // Remove from local state
        setItems(items.filter(item => item.id !== itemId));
        setError(null);
      } else {
        setError(result.error || 'Failed to delete labor item');
      }
    } catch (err) {
      console.error('Error deleting labor item:', err);
      setError('An error occurred while deleting the labor item');
    }
  };

  const handleSave = (savedItem: LaborItem) => {
    if (editingItem?.id) {
      // Update existing item in local state
      setItems(items.map(item => item.id === savedItem.id ? savedItem : item));
    } else {
      // Add new item to local state
      setItems([...items, savedItem]);
    }
    setEditingItem(null);
    setViewOnly(false);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setViewOnly(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <LaborHeader onAddItem={handleAddNew} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Filter */}
          <LaborFilter
            filterState={filterState}
            onFilterChange={setFilterState}
          />

          {/* Table */}
          <LaborTable
            items={displayItems}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />

          {/* Summary Stats */}
          {!loading && items.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {displayItems.length} of {items.length} labor items
                </span>
                {filterState.searchTerm || filterState.tradeId || filterState.sectionId || 
                 filterState.categoryId || filterState.pricingType ? (
                  <button
                    onClick={() => setFilterState({
                      searchTerm: '',
                      tradeId: '',
                      sectionId: '',
                      categoryId: '',
                      pricingType: '',
                      sortBy: 'name'
                    })}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Creation/Edit Modal */}
      {showModal && (
        <LaborCreationModal
          item={editingItem}
          viewOnly={viewOnly}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Labor;