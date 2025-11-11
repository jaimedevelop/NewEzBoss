// src/pages/collections/components/CollectionsScreen/CollectionsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useAutoSave } from '../../../../hooks/useAutoSave';
import SavingIndicator from '../../../../mainComponents/ui/SavingIndicator';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { 
  getCachedProducts, 
  setCachedProducts,
  invalidateCache 
} from '../../../../utils/productCache';

import type { 
  Collection, 
  ItemSelection,
  CollectionContentType,
} from '../../../../services/collections';

import {
  batchUpdateProductSelections,
  batchUpdateLaborSelections,
  batchUpdateToolSelections,
  batchUpdateEquipmentSelections,
  getProductsForCollectionTabs,
  getLaborItemsForCollectionTabs,
  getToolsForCollectionTabs,
  getEquipmentForCollectionTabs,
  updateCollectionMetadata,
} from '../../../../services/collections';

import CollectionHeader from './components/CollectionHeader';
import CollectionSearchFilter from './components/CollectionSearchFilter';
import CollectionTopTabBar from './components/CollectionTopTabBar';
import CategoryTabBar from '../CategoryTabBar';
import MasterTabView from './components/MasterTabView';
import CategoryTabView from './components/CategoryTabView';
import TaxConfigModal from './components/TaxConfigModal';

interface CollectionsScreenProps {
  collection: Collection;
  onBack: () => void;
  onDelete?: () => void;
  activeCategoryTabIndex: number;
  onCategoryTabChange: (index: number) => void;
}

const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ 
  collection, 
  onBack, 
  onDelete,
  activeCategoryTabIndex,
  onCategoryTabChange
}) => {
  const { currentUser } = useAuthContext();

  // Content Type State
  const [activeContentType, setActiveContentType] = useState<CollectionContentType>('products');

  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [collectionName, setCollectionName] = useState(collection?.name || 'New Collection');
  const [collectionDescription, setCollectionDescription] = useState(
    collection?.categorySelection?.description || ''
  );
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxRate, setTaxRate] = useState(collection?.taxRate ?? 0.07);

  // Filter State
  const [filterState, setFilterState] = useState({
    searchTerm: '',
    sizeFilter: '',
    stockFilter: '',
    locationFilter: '',
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // === PRODUCTS STATE ===
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSelections, setProductSelections] = useState<Record<string, ItemSelection>>(
    collection?.productSelections || {}
  );
  const [lastSavedProductSelections, setLastSavedProductSelections] = useState<Record<string, ItemSelection>>(
    collection?.productSelections || {}
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);

  // === LABOR STATE ===
  const [allLaborItems, setAllLaborItems] = useState<any[]>([]);
  const [laborSelections, setLaborSelections] = useState<Record<string, ItemSelection>>(
    collection?.laborSelections || {}
  );
  const [lastSavedLaborSelections, setLastSavedLaborSelections] = useState<Record<string, ItemSelection>>(
    collection?.laborSelections || {}
  );
  const [isLoadingLabor, setIsLoadingLabor] = useState(false);
  const [laborLoadError, setLaborLoadError] = useState<string | null>(null);

  // === TOOLS STATE ===
  const [allToolItems, setAllToolItems] = useState<any[]>([]);
  const [toolSelections, setToolSelections] = useState<Record<string, ItemSelection>>(
    collection?.toolSelections || {}
  );
  const [lastSavedToolSelections, setLastSavedToolSelections] = useState<Record<string, ItemSelection>>(
    collection?.toolSelections || {}
  );
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolLoadError, setToolLoadError] = useState<string | null>(null);

  // === EQUIPMENT STATE ===
  const [allEquipmentItems, setAllEquipmentItems] = useState<any[]>([]);
  const [equipmentSelections, setEquipmentSelections] = useState<Record<string, ItemSelection>>(
    collection?.equipmentSelections || {}
  );
  const [lastSavedEquipmentSelections, setLastSavedEquipmentSelections] = useState<Record<string, ItemSelection>>(
    collection?.equipmentSelections || {}
  );
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [equipmentLoadError, setEquipmentLoadError] = useState<string | null>(null);

  // Update local state when collection changes
  useEffect(() => {
    setTaxRate(collection?.taxRate ?? 0.07);
    setCollectionName(collection?.name || 'New Collection');
    setCollectionDescription(collection?.categorySelection?.description || '');
    setProductSelections(collection?.productSelections || {});
    setLastSavedProductSelections(collection?.productSelections || {});
    setLaborSelections(collection?.laborSelections || {});
    setLastSavedLaborSelections(collection?.laborSelections || {});
    setToolSelections(collection?.toolSelections || {});
    setLastSavedToolSelections(collection?.toolSelections || {});
    setEquipmentSelections(collection?.equipmentSelections || {});
    setLastSavedEquipmentSelections(collection?.equipmentSelections || {});
  }, [collection.id]);

  // Load data based on active content type
  useEffect(() => {
    switch (activeContentType) {
      case 'products':
        if (collection?.productCategoryTabs?.length > 0 && allProducts.length === 0) {
          loadAllProducts();
        }
        break;
      case 'labor':
        if (collection?.laborCategoryTabs?.length > 0 && allLaborItems.length === 0) {
          loadAllLabor();
        }
        break;
      case 'tools':
        if (collection?.toolCategoryTabs?.length > 0 && allToolItems.length === 0) {
          loadAllTools();
        }
        break;
      case 'equipment':
        if (collection?.equipmentCategoryTabs?.length > 0 && allEquipmentItems.length === 0) {
          loadAllEquipment();
        }
        break;
    }
  }, [activeContentType, collection.id]);
  // === LOADING FUNCTIONS ===
  
  const loadAllProducts = async () => {
    if (!collection?.productCategoryTabs || collection.productCategoryTabs.length === 0) {
      setIsLoadingProducts(false);
      return;
    }

    setIsLoadingProducts(true);
    setProductLoadError(null);

    try {
      const allProductIds = Array.from(
        new Set(collection.productCategoryTabs.flatMap(tab => tab.itemIds))
      );

      const { cachedProducts, missingIds } = getCachedProducts(allProductIds);
      let fetchedProducts: any[] = [];

      if (missingIds.length > 0) {
        const result = await getProductsForCollectionTabs(missingIds);
        if (result.success && result.data) {
          fetchedProducts = result.data;
          setCachedProducts(fetchedProducts);
        } else {
          setProductLoadError(result.error?.message || 'Failed to load products');
        }
      }

      setAllProducts([...cachedProducts, ...fetchedProducts]);
    } catch (error: any) {
      setProductLoadError(error.message || 'Error loading products');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadAllLabor = async () => {
    if (!collection?.laborCategoryTabs || collection.laborCategoryTabs.length === 0) {
      setIsLoadingLabor(false);
      return;
    }

    setIsLoadingLabor(true);
    setLaborLoadError(null);

    try {
      const allLaborIds = Array.from(
        new Set(collection.laborCategoryTabs.flatMap(tab => tab.itemIds))
      );

      const result = await getLaborItemsForCollectionTabs(allLaborIds);
      if (result.success && result.data) {
        setAllLaborItems(result.data);
      } else {
        setLaborLoadError(result.error?.message || 'Failed to load labor items');
      }
    } catch (error: any) {
      setLaborLoadError(error.message || 'Error loading labor items');
    } finally {
      setIsLoadingLabor(false);
    }
  };

  const loadAllTools = async () => {
    if (!collection?.toolCategoryTabs || collection.toolCategoryTabs.length === 0) {
      setIsLoadingTools(false);
      return;
    }

    setIsLoadingTools(true);
    setToolLoadError(null);

    try {
      const allToolIds = Array.from(
        new Set(collection.toolCategoryTabs.flatMap(tab => tab.itemIds))
      );

      const result = await getToolsForCollectionTabs(allToolIds);
      if (result.success && result.data) {
        setAllToolItems(result.data);
      } else {
        setToolLoadError(result.error?.message || 'Failed to load tools');
      }
    } catch (error: any) {
      setToolLoadError(error.message || 'Error loading tools');
    } finally {
      setIsLoadingTools(false);
    }
  };

  const loadAllEquipment = async () => {
    if (!collection?.equipmentCategoryTabs || collection.equipmentCategoryTabs.length === 0) {
      setIsLoadingEquipment(false);
      return;
    }

    setIsLoadingEquipment(true);
    setEquipmentLoadError(null);

    try {
      const allEquipmentIds = Array.from(
        new Set(collection.equipmentCategoryTabs.flatMap(tab => tab.itemIds))
      );

      const result = await getEquipmentForCollectionTabs(allEquipmentIds);
      if (result.success && result.data) {
        setAllEquipmentItems(result.data);
      } else {
        setEquipmentLoadError(result.error?.message || 'Failed to load equipment');
      }
    } catch (error: any) {
      setEquipmentLoadError(error.message || 'Error loading equipment');
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  // === AUTO-SAVE HOOKS ===
  
  const { saveStatus: productSaveStatus, saveError: productSaveError, clearError: clearProductError } = useAutoSave({
    data: productSelections,
    onSave: async (selections) => {
      if (!collection.id) return;
      
      const changedSelections: Record<string, ItemSelection> = {};
      Object.keys(selections).forEach(id => {
        const current = selections[id];
        const previous = lastSavedProductSelections[id];
        if (!previous || current.quantity !== previous.quantity || current.isSelected !== previous.isSelected) {
          changedSelections[id] = current;
        }
      });
      
      Object.keys(lastSavedProductSelections).forEach(id => {
        if (!selections[id]) {
          changedSelections[id] = { ...lastSavedProductSelections[id], isSelected: false, quantity: 0 };
        }
      });
      
      if (Object.keys(changedSelections).length === 0) return;
      
      const result = await batchUpdateProductSelections(collection.id, changedSelections);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save selections');
      }
      setLastSavedProductSelections(selections);
    },
    debounceMs: 1000,
    enabled: activeContentType === 'products',
  });

  const { saveStatus: laborSaveStatus, saveError: laborSaveError, clearError: clearLaborError } = useAutoSave({
    data: laborSelections,
    onSave: async (selections) => {
      if (!collection.id) return;
      
      const changedSelections: Record<string, ItemSelection> = {};
      Object.keys(selections).forEach(id => {
        const current = selections[id];
        const previous = lastSavedLaborSelections[id];
        if (!previous || current.quantity !== previous.quantity || current.isSelected !== previous.isSelected) {
          changedSelections[id] = current;
        }
      });
      
      if (Object.keys(changedSelections).length === 0) return;
      
      const result = await batchUpdateLaborSelections(collection.id, changedSelections);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save selections');
      }
      setLastSavedLaborSelections(selections);
    },
    debounceMs: 1000,
    enabled: activeContentType === 'labor',
  });

  const { saveStatus: toolSaveStatus, saveError: toolSaveError, clearError: clearToolError } = useAutoSave({
    data: toolSelections,
    onSave: async (selections) => {
      if (!collection.id) return;
      
      const changedSelections: Record<string, ItemSelection> = {};
      Object.keys(selections).forEach(id => {
        const current = selections[id];
        const previous = lastSavedToolSelections[id];
        if (!previous || current.quantity !== previous.quantity || current.isSelected !== previous.isSelected) {
          changedSelections[id] = current;
        }
      });
      
      if (Object.keys(changedSelections).length === 0) return;
      
      const result = await batchUpdateToolSelections(collection.id, changedSelections);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save selections');
      }
      setLastSavedToolSelections(selections);
    },
    debounceMs: 1000,
    enabled: activeContentType === 'tools',
  });

  const { saveStatus: equipmentSaveStatus, saveError: equipmentSaveError, clearError: clearEquipmentError } = useAutoSave({
    data: equipmentSelections,
    onSave: async (selections) => {
      if (!collection.id) return;
      
      const changedSelections: Record<string, ItemSelection> = {};
      Object.keys(selections).forEach(id => {
        const current = selections[id];
        const previous = lastSavedEquipmentSelections[id];
        if (!previous || current.quantity !== previous.quantity || current.isSelected !== previous.isSelected) {
          changedSelections[id] = current;
        }
      });
      
      if (Object.keys(changedSelections).length === 0) return;
      
      const result = await batchUpdateEquipmentSelections(collection.id, changedSelections);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save selections');
      }
      setLastSavedEquipmentSelections(selections);
    },
    debounceMs: 1000,
    enabled: activeContentType === 'equipment',
  });

  // Get current save status based on active content type
  const currentSaveStatus = useMemo(() => {
    switch (activeContentType) {
      case 'products': return productSaveStatus;
      case 'labor': return laborSaveStatus;
      case 'tools': return toolSaveStatus;
      case 'equipment': return equipmentSaveStatus;
    }
  }, [activeContentType, productSaveStatus, laborSaveStatus, toolSaveStatus, equipmentSaveStatus]);

  const currentSaveError = useMemo(() => {
    switch (activeContentType) {
      case 'products': return productSaveError;
      case 'labor': return laborSaveError;
      case 'tools': return toolSaveError;
      case 'equipment': return equipmentSaveError;
    }
  }, [activeContentType, productSaveError, laborSaveError, toolSaveError, equipmentSaveError]);

  const clearCurrentError = useCallback(() => {
    switch (activeContentType) {
      case 'products': clearProductError(); break;
      case 'labor': clearLaborError(); break;
      case 'tools': clearToolError(); break;
      case 'equipment': clearEquipmentError(); break;
    }
  }, [activeContentType]);

  // === HANDLERS ===

  const handleToggleSelection = useCallback((itemId: string) => {
    const setter = activeContentType === 'products' ? setProductSelections :
                   activeContentType === 'labor' ? setLaborSelections :
                   activeContentType === 'tools' ? setToolSelections :
                   setEquipmentSelections;

    const tabs = activeContentType === 'products' ? collection.productCategoryTabs :
                 activeContentType === 'labor' ? collection.laborCategoryTabs :
                 activeContentType === 'tools' ? collection.toolCategoryTabs :
                 collection.equipmentCategoryTabs;

    const items = activeContentType === 'products' ? allProducts :
                  activeContentType === 'labor' ? allLaborItems :
                  activeContentType === 'tools' ? allToolItems :
                  allEquipmentItems;

    setter(prev => {
      const current = prev[itemId];
      const currentTab = tabs?.[Math.max(0, activeCategoryTabIndex - 1)];
      
      if (current?.isSelected) {
        const { [itemId]: removed, ...rest } = prev;
        return rest;
      }
      
      const item = items.find(i => i.id === itemId);
      
      return {
        ...prev,
        [itemId]: {
          isSelected: true,
          quantity: 1,
          categoryTabId: currentTab?.id || '',
          addedAt: Date.now(),
          itemName: item?.name,
          itemSku: item?.skus?.[0]?.sku || item?.sku,
          unitPrice: item?.priceEntries?.[0]?.price || 0,
        },
      };
    });
  }, [activeContentType, activeCategoryTabIndex, collection, allProducts, allLaborItems, allToolItems, allEquipmentItems]);

  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    const setter = activeContentType === 'products' ? setProductSelections :
                   activeContentType === 'labor' ? setLaborSelections :
                   activeContentType === 'tools' ? setToolSelections :
                   setEquipmentSelections;

    setter(prev => {
      const current = prev[itemId];
      if (!current) return prev;

      if (quantity <= 0) {
        const { [itemId]: removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [itemId]: { ...current, quantity },
      };
    });
  }, [activeContentType]);

  // Get current data based on active content type
  const getCurrentTabData = () => {
    const tabs = activeContentType === 'products' ? collection.productCategoryTabs :
                 activeContentType === 'labor' ? collection.laborCategoryTabs :
                 activeContentType === 'tools' ? collection.toolCategoryTabs :
                 collection.equipmentCategoryTabs;

    const items = activeContentType === 'products' ? allProducts :
                  activeContentType === 'labor' ? allLaborItems :
                  activeContentType === 'tools' ? allToolItems :
                  allEquipmentItems;

    const selections = activeContentType === 'products' ? productSelections :
                       activeContentType === 'labor' ? laborSelections :
                       activeContentType === 'tools' ? toolSelections :
                       equipmentSelections;

    const isLoading = activeContentType === 'products' ? isLoadingProducts :
                      activeContentType === 'labor' ? isLoadingLabor :
                      activeContentType === 'tools' ? isLoadingTools :
                      isLoadingEquipment;

    const loadError = activeContentType === 'products' ? productLoadError :
                      activeContentType === 'labor' ? laborLoadError :
                      activeContentType === 'tools' ? toolLoadError :
                      equipmentLoadError;

    if (activeCategoryTabIndex === 0) {
      // Master tab - show selected items
      return {
        items: items.filter(item => selections[item.id]?.isSelected),
        selections,
        isLoading,
        loadError,
        tabs,
      };
    } else {
      // Category tab
      const currentTab = tabs?.[activeCategoryTabIndex - 1];
      if (!currentTab) return { items: [], selections, isLoading, loadError, tabs };

      return {
        items: items.filter(item => 
          item.section === currentTab.section && 
          item.category === currentTab.category &&
          currentTab.itemIds.includes(item.id)
        ),
        selections,
        isLoading,
        loadError,
        tabs,
      };
    }
  };

  const { items: currentItems, selections: currentSelections, isLoading, loadError, tabs: currentTabs } = getCurrentTabData();
  const currentTab = activeCategoryTabIndex > 0 ? currentTabs?.[activeCategoryTabIndex - 1] : null;

  // Edit handlers
  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setIsEditing(false);
    setCollectionName(collection?.name || 'New Collection');
    setCollectionDescription(collection?.categorySelection?.description || '');
  };
  const handleSave = async () => {
    if (collectionName !== collection.name || collectionDescription !== collection.categorySelection?.description) {
      if (collection.id) {
        await updateCollectionMetadata(collection.id, {
          name: collectionName,
          description: collectionDescription,
        });
      }
    }
    setIsEditing(false);
  };

  const handleAddCategories = () => {
    // TODO: Open category selector modal
    console.log('Add categories for', activeContentType);
  };

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No collection selected</p>
          <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Save Status Indicator */}
      <SavingIndicator 
        status={currentSaveStatus}
        error={currentSaveError}
        onDismissError={clearCurrentError}
      />

      {/* Error Alert */}
      {currentSaveError && (
        <div className="fixed top-16 right-4 z-40 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">Save Error</p>
              <p className="text-sm">{currentSaveError}</p>
              <button onClick={clearCurrentError} className="text-xs underline mt-1">
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Tax Config Modal */}
      {showTaxModal && (
        <TaxConfigModal
          currentTaxRate={taxRate}
          collectionId={collection.id!}
          onClose={() => setShowTaxModal(false)}
          onSave={(newTaxRate) => {
            setTaxRate(newTaxRate);
            setShowTaxModal(false);
          }}
        />
      )}

      {/* Header */}
      <CollectionHeader
        collectionName={collectionName}
        trade={collection.categorySelection?.trade || collection.category}
        isEditing={isEditing}
        onBack={onBack}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={onDelete}
        onNameChange={setCollectionName}
        onOptionsClick={() => setShowTaxModal(true)}
      />

      {/* Top Tab Bar - Content Type Switcher */}
      <CollectionTopTabBar
        activeContentType={activeContentType}
        collection={collection}
        onContentTypeChange={setActiveContentType}
      />

      {/* Search Filter */}
      <CollectionSearchFilter
        filterState={filterState}
        onFilterChange={setFilterState}
        availableSizes={[]}
        availableLocations={[]}
        isCollapsed={isFilterCollapsed}
        onToggleCollapse={() => setIsFilterCollapsed(!isFilterCollapsed)}
        isMasterTab={activeCategoryTabIndex === 0}
      /> 

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeCategoryTabIndex === 0 ? (
          // Master Tab View
          <MasterTabView
            collectionName={collectionName}
            taxRate={taxRate}
            productCategoryTabs={collection.productCategoryTabs || []}
            allProducts={allProducts}
            productSelections={productSelections}
            laborCategoryTabs={collection.laborCategoryTabs || []}
            allLaborItems={allLaborItems}
            laborSelections={laborSelections}
            toolCategoryTabs={collection.toolCategoryTabs || []}
            allToolItems={allToolItems}
            toolSelections={toolSelections}
            equipmentCategoryTabs={collection.equipmentCategoryTabs || []}
            allEquipmentItems={allEquipmentItems}
            equipmentSelections={equipmentSelections}
          />
        ) : (
          // Category Tab View
          currentTab && (
            <CategoryTabView
              contentType={activeContentType}
              categoryName={currentTab.name}
              subcategories={currentTab.subcategories}
              items={currentItems}
              selections={currentSelections}
              isLoading={isLoading}
              loadError={loadError}
              onToggleSelection={handleToggleSelection}
              onQuantityChange={handleQuantityChange}
              onRetry={() => {
                switch (activeContentType) {
                  case 'products': loadAllProducts(); break;
                  case 'labor': loadAllLabor(); break;
                  case 'tools': loadAllTools(); break;
                  case 'equipment': loadAllEquipment(); break;
                }
              }}
            />
          )
        )}
      </div>
    </div>
  );
};

export default CollectionsScreen;