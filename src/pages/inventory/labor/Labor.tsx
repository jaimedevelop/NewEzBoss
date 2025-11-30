// src/pages/labor/Labor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getLaborItems, deleteLaborItem, type LaborItem } from '../../../services/inventory/labor';
import { LaborHeader } from './components/LaborHeader';
import LaborFilter, { type LaborFilterState } from './components/LaborFilter';
import { LaborTable } from './components/LaborTable';
import { LaborCreationModal } from './components/LaborCreationModal';
import { Alert } from '../../../mainComponents/ui/Alert';

export const Labor: React.FC = () => {
  const { currentUser } = useAuthContext();

  const [reloadTrigger, setReloadTrigger] = useState(0);

  // State
  const [items, setItems] = useState<LaborItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LaborItem | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  
  // Filter state
  const [filterState, setFilterState] = useState<LaborFilterState>({
    searchTerm: '',
    tradeId: '',
    sectionId: '',
    categoryId: '',
    tier: '',
    sortBy: 'name'
  });

  const handleFilterChange = useCallback((newFilterState: LaborFilterState) => {
    setFilterState(newFilterState);
  }, []);

  const handleCategoryUpdate = () => {
    setReloadTrigger(prev => prev + 1);
  };

  // Load labor items
  useEffect(() => {
    const loadItems = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const filters = {
          tradeId: filterState.tradeId || undefined,
          sectionId: filterState.sectionId || undefined,
          categoryId: filterState.categoryId || undefined,
          searchTerm: filterState.searchTerm || undefined,
          tier: filterState.tier || undefined
        };
        
        const result = await getLaborItems(currentUser.uid, filters);
        
        if (result.success && result.data) {
          setItems(result.data);
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
  }, [currentUser?.uid, filterState, reloadTrigger]);

  // Sort items based on sort field (client-side sort)
  const getSortedItems = (items: LaborItem[]): LaborItem[] => {
    const sorted = [...items];
    
    switch (filterState.sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'tradeName':
        return sorted.sort((a, b) => (a.tradeName || '').localeCompare(b.tradeName || ''));
      case 'sectionName':
        return sorted.sort((a, b) => (a.sectionName || '').localeCompare(b.sectionName || ''));
      case 'categoryName':
        return sorted.sort((a, b) => (a.categoryName || '').localeCompare(b.categoryName || ''));
      case 'createdAt':
        return sorted.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
          return bDate - aDate;
        });
      default:
        return sorted;
    }
  };

  const displayItems = getSortedItems(items);

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
    const baseNameMatch = item.name.match(/^(.+?)(?:\s*\((\d+)\))?$/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : item.name;
    
    const relatedItems = items.filter(i => {
      const match = i.name.match(/^(.+?)(?:\s*\((\d+)\))?$/);
      const iBaseName = match ? match[1].trim() : i.name;
      return iBaseName === baseName;
    });
    
    const copyNumbers = relatedItems
      .map(i => {
        const match = i.name.match(/\((\d+)\)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    const nextCopyNumber = copyNumbers.length > 0 ? Math.max(...copyNumbers) + 1 : 1;
    
    const duplicatedItem: LaborItem = {
      ...item,
      id: undefined,
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
      setItems(items.map(item => item.id === savedItem.id ? savedItem : item));
    } else {
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
      <LaborHeader onAddItem={handleAddNew} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <LaborFilter
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onCategoryUpdated={handleCategoryUpdate}
          />

          <LaborTable
            items={displayItems}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </div>
      </div>

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