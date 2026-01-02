// src/pages/collections/components/CollectionsScreen/CollectionsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { updateCollectionMetadata } from '../../../../services/collections';
import type { Collection, CollectionContentType, ItemSelection } from '../../../../services/collections';

// Custom hooks
import {
  useCollectionSelections,
  useCollectionTabs,
  useCollectionItems,
  useCollectionSave
} from '../../../../hooks/collections/collectionsScreen';

// Components
import CollectionHeader from './components/CollectionHeader';
import CollectionSearchFilter from './components/CollectionSearchFilter';
import CollectionTopTabBar from './components/CollectionTopTabBar';
import CategoryTabBar from '../CategoryTabBar';
import MasterTabView from './components/MasterTabView';
import CategoryTabView from './components/CategoryTabView';
import CollectionSummary from './components/CollectionSummary';
import TaxConfigModal from './components/TaxConfigModal';

type CollectionViewType = 'summary' | CollectionContentType;

interface CollectionsScreenProps {
  collection: Collection;
  onBack: () => void;
  onDelete?: () => void;
  activeCategoryTabIndex: number;
  onCategoryTabChange: (index: number) => void;
  onSelectionsChange?: (selections: {
    products: Record<string, ItemSelection>;
    labor: Record<string, ItemSelection>;
    tools: Record<string, ItemSelection>;
    equipment: Record<string, ItemSelection>;
  }) => void;
  activeView?: CollectionViewType;
  onViewChange?: (view: CollectionViewType) => void;
  onRemoveCategory?: (categoryTabId: string) => void;
  onRefreshItems?: () => void;
  isRefreshingItems?: boolean;
  newlyAddedItemIds?: Set<string>;
  onHasUnsavedChanges?: (hasChanges: boolean, contentType: CollectionContentType) => void;
  onSaveComplete?: () => void;
  onTabsUpdated?: (contentType: CollectionContentType, updatedCollection: Collection) => void;
}

const CollectionsScreen: React.FC<CollectionsScreenProps> = ({
  collection,
  onBack,
  onDelete,
  activeCategoryTabIndex,
  onCategoryTabChange,
  onSelectionsChange,
  activeView: externalView,
  onViewChange: externalOnViewChange,
  onRemoveCategory,
  onRefreshItems,
  isRefreshingItems,
  newlyAddedItemIds,
  onHasUnsavedChanges,
  onSaveComplete,
  onTabsUpdated,
}) => {
  const { currentUser } = useAuthContext();

  // View state
  const [internalView, setInternalView] = useState<CollectionViewType>('summary');
  const activeView = externalView ?? internalView;
  const setActiveView = useCallback((view: CollectionViewType) => {
    if (externalOnViewChange) {
      externalOnViewChange(view);
    } else {
      setInternalView(view);
    }
  }, [externalOnViewChange]);

  const activeContentType: CollectionContentType =
    activeView === 'summary' ? 'products' : activeView;

  // Collection metadata state
  const [isEditing, setIsEditing] = useState(false);
  const [collectionName, setCollectionName] = useState(collection?.name || 'New Collection');
  const [collectionDescription, setCollectionDescription] = useState(collection?.description || '');
  const [collectionTrade, setCollectionTrade] = useState(collection?.categorySelection?.trade || '');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxRate, setTaxRate] = useState(collection?.taxRate ?? 0.07);

  // Filter state
  const [filterState, setFilterState] = useState({
    searchTerm: '',
    sizeFilter: '',
    stockFilter: '',
    locationFilter: '',
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // Initialize custom hooks
  const selections = useCollectionSelections({
    initialProductSelections: collection?.productSelections || {},
    initialLaborSelections: collection?.laborSelections || {},
    initialToolSelections: collection?.toolSelections || {},
    initialEquipmentSelections: collection?.equipmentSelections || {},
  });

  const tabs = useCollectionTabs({
    initialProductTabs: collection.productCategoryTabs || [],
    initialLaborTabs: collection.laborCategoryTabs || [],
    initialToolTabs: collection.toolCategoryTabs || [],
    initialEquipmentTabs: collection.equipmentCategoryTabs || [],
  });

  const items = useCollectionItems();
  const { isSaving, saveError, handleSave, clearError } = useCollectionSave();

  // Sync collection changes (when collection.id changes)
  useEffect(() => {
    setTaxRate(collection?.taxRate ?? 0.07);
    setCollectionName(collection?.name || 'New Collection');
    setCollectionDescription(collection?.description || '');
    setCollectionTrade(collection?.categorySelection?.trade || '');

    selections.resetAll(
      collection?.productSelections || {},
      collection?.laborSelections || {},
      collection?.toolSelections || {},
      collection?.equipmentSelections || {}
    );

    tabs.resetAll(
      collection.productCategoryTabs || [],
      collection.laborCategoryTabs || [],
      collection.toolCategoryTabs || [],
      collection.equipmentCategoryTabs || []
    );
  }, [collection.id]);

  // Sync tabs from prop changes (category add/remove)
  useEffect(() => {
    tabs.syncFromProps('products', collection.productCategoryTabs || [], tabs.hasUnsavedProductTabChanges);
  }, [collection.productCategoryTabs]);

  useEffect(() => {
    tabs.syncFromProps('labor', collection.laborCategoryTabs || [], tabs.hasUnsavedLaborTabChanges);
  }, [collection.laborCategoryTabs]);

  useEffect(() => {
    tabs.syncFromProps('tools', collection.toolCategoryTabs || [], tabs.hasUnsavedToolTabChanges);
  }, [collection.toolCategoryTabs]);

  useEffect(() => {
    tabs.syncFromProps('equipment', collection.equipmentCategoryTabs || [], tabs.hasUnsavedEquipmentTabChanges);
  }, [collection.equipmentCategoryTabs]);

  // Sync selections from Firebase subscription
  useEffect(() => {
    selections.syncFromFirebase('products', collection?.productSelections || {}, selections.hasUnsavedProductChanges);
  }, [collection?.productSelections]);

  useEffect(() => {
    selections.syncFromFirebase('labor', collection?.laborSelections || {}, selections.hasUnsavedLaborChanges);
  }, [collection?.laborSelections]);

  useEffect(() => {
    selections.syncFromFirebase('tools', collection?.toolSelections || {}, selections.hasUnsavedToolChanges);
  }, [collection?.toolSelections]);

  useEffect(() => {
    selections.syncFromFirebase('equipment', collection?.equipmentSelections || {}, selections.hasUnsavedEquipmentChanges);
  }, [collection?.equipmentSelections]);

  // Expose tabs update method to parent
  useEffect(() => {
    if (onTabsUpdated) {
      // Create a handler that parent can call to update tabs
      // This is stored in a ref-like pattern via the callback
      (window as any).__updateCollectionTabs = (contentType: CollectionContentType, updatedCollection: Collection) => {
        console.log('📥 [CollectionsScreen] Receiving tabs update from parent', {
          contentType,
          newTabsCount: contentType === 'products' ? updatedCollection.productCategoryTabs?.length :
                       contentType === 'labor' ? updatedCollection.laborCategoryTabs?.length :
                       contentType === 'tools' ? updatedCollection.toolCategoryTabs?.length :
                       updatedCollection.equipmentCategoryTabs?.length
        });

        // Update local tabs based on content type
        switch (contentType) {
          case 'products':
            tabs.updateLocalTabs('products', updatedCollection.productCategoryTabs || []);
            selections.updateSelections('products', () => updatedCollection.productSelections || {});
            break;
          case 'labor':
            tabs.updateLocalTabs('labor', updatedCollection.laborCategoryTabs || []);
            selections.updateSelections('labor', () => updatedCollection.laborSelections || {});
            break;
          case 'tools':
            tabs.updateLocalTabs('tools', updatedCollection.toolCategoryTabs || []);
            selections.updateSelections('tools', () => updatedCollection.toolSelections || {});
            break;
          case 'equipment':
            tabs.updateLocalTabs('equipment', updatedCollection.equipmentCategoryTabs || []);
            selections.updateSelections('equipment', () => updatedCollection.equipmentSelections || {});
            break;
        }
      };
    }
  }, [onTabsUpdated, tabs, selections]);

  // Notify parent of unsaved changes
  useEffect(() => {
    if (onHasUnsavedChanges) {
      onHasUnsavedChanges(selections.hasUnsavedProductChanges, 'products');
      onHasUnsavedChanges(selections.hasUnsavedLaborChanges, 'labor');
      onHasUnsavedChanges(selections.hasUnsavedToolChanges, 'tools');
      onHasUnsavedChanges(selections.hasUnsavedEquipmentChanges, 'equipment');
    }
  }, [
    selections.hasUnsavedProductChanges,
    selections.hasUnsavedLaborChanges,
    selections.hasUnsavedToolChanges,
    selections.hasUnsavedEquipmentChanges,
    onHasUnsavedChanges,
  ]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionsChange?.({
      products: selections.productSelections,
      labor: selections.laborSelections,
      tools: selections.toolSelections,
      equipment: selections.equipmentSelections,
    });
  }, [
    selections.productSelections,
    selections.laborSelections,
    selections.toolSelections,
    selections.equipmentSelections,
    onSelectionsChange,
  ]);

  // Load items when tabs change
useEffect(() => {
  if (activeView === 'summary') {
    if (tabs.localProductTabs.length > 0) items.loadItems('products', tabs.localProductTabs);
    if (tabs.localLaborTabs.length > 0) items.loadItems('labor', tabs.localLaborTabs);
    if (tabs.localToolTabs.length > 0) items.loadItems('tools', tabs.localToolTabs);
    if (tabs.localEquipmentTabs.length > 0) items.loadItems('equipment', tabs.localEquipmentTabs);
  } else {
    switch (activeView) {
      case 'products':
        if (tabs.localProductTabs.length > 0) items.loadItems('products', tabs.localProductTabs);
        break;
      case 'labor':
        if (tabs.localLaborTabs.length > 0) items.loadItems('labor', tabs.localLaborTabs);
        break;
      case 'tools':
        if (tabs.localToolTabs.length > 0) items.loadItems('tools', tabs.localToolTabs);
        break;
      case 'equipment':
        if (tabs.localEquipmentTabs.length > 0) items.loadItems('equipment', tabs.localEquipmentTabs);
        break;
    }
  }
}, [
  activeView,
  collection.id,
  collection.productCategoryTabs,
  collection.laborCategoryTabs,
  collection.toolCategoryTabs,
  collection.equipmentCategoryTabs,
  // Change from length to the actual tab arrays
  tabs.localProductTabs,
  tabs.localLaborTabs,
  tabs.localToolTabs,
  tabs.localEquipmentTabs,
]);

  // Save handler
  const handleSaveChanges = useCallback(async () => {
    if (!collection.id || activeView === 'summary') return;

    await handleSave(
      {
        collectionId: collection.id,
        productCategoryTabs: tabs.localProductTabs,
        productSelections: selections.productSelections,
        laborCategoryTabs: tabs.localLaborTabs,
        laborSelections: selections.laborSelections,
        toolCategoryTabs: tabs.localToolTabs,
        toolSelections: selections.toolSelections,
        equipmentCategoryTabs: tabs.localEquipmentTabs,
        equipmentSelections: selections.equipmentSelections,
        categorySelection: collection.categorySelection,
      },
      (contentType) => {
        // Mark as saved
        selections.markAsSaved(contentType);
        tabs.markTabsAsSaved(contentType);
        onSaveComplete?.();
      },
      activeContentType
    );
  }, [collection, activeView, activeContentType, selections, tabs, handleSave, onSaveComplete]);

  // Item interaction handlers
  const handleToggleSelection = useCallback((itemId: string) => {
    if (activeView === 'summary') return;

    const currentTabs = tabs.getLocalTabs(activeContentType);
    const currentItems = items.getItems(activeContentType);
    const currentTab = currentTabs?.[Math.max(0, activeCategoryTabIndex - 1)];

    selections.updateSelections(activeContentType, prev => {
      const current = prev[itemId];

      if (current?.isSelected) {
        const { [itemId]: removed, ...rest } = prev;
        return rest;
      }

      const item = currentItems.find(i => i.id === itemId);

      const getPrice = () => {
        switch (activeContentType) {
          case 'products':
            if (item?.priceEntries && Array.isArray(item.priceEntries) && item.priceEntries.length > 0) {
              return Math.max(...item.priceEntries.map((entry: any) => entry.price || 0));
            }
            return item?.unitPrice || 0;
          case 'labor':
            return item?.flatRates?.[0]?.rate || item?.hourlyRates?.[0]?.hourlyRate || 0;
          case 'tools':
          case 'equipment':
            return item?.minimumCustomerCharge || 0;
          default:
            return 0;
        }
      };

      const newSelection: ItemSelection = {
        isSelected: true,
        quantity: 1,
        categoryTabId: currentTab?.id || '',
        addedAt: Date.now(),
        itemName: item?.name,
        itemSku: item?.skus?.[0]?.sku || item?.sku,
        unitPrice: getPrice(),
      };

      if (activeContentType === 'labor' && item?.estimatedHours) {
        newSelection.estimatedHours = item.estimatedHours;
      }

      return {
        ...prev,
        [itemId]: newSelection,
      };
    });
  }, [activeView, activeContentType, activeCategoryTabIndex, selections, tabs, items]);

  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    if (activeView === 'summary') return;

    selections.updateSelections(activeContentType, prev => {
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
  }, [activeView, activeContentType, selections]);

  const handleLaborHoursChange = useCallback((itemId: string, hours: number) => {
    if (activeView === 'summary' || activeContentType !== 'labor') return;

    selections.updateSelections('labor', prev => {
      const current = prev[itemId];
      if (!current) return prev;

      return {
        ...prev,
        [itemId]: {
          ...current,
          estimatedHours: hours > 0 ? hours : undefined
        },
      };
    });
  }, [activeView, activeContentType, selections]);

  const handleRefreshItems = useCallback(async () => {
    if (activeView === 'summary' || !currentUser) return;

    items.clearItems(activeContentType);
    await items.loadItems(activeContentType, tabs.getLocalTabs(activeContentType));
  }, [activeView, activeContentType, currentUser, items, tabs]);

  // Metadata editing handlers
  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setIsEditing(false);
    setCollectionName(collection?.name || 'New Collection');
    setCollectionDescription(collection?.description || '');
    setCollectionTrade(collection?.categorySelection?.trade || '');
  };
  const handleSaveMetadata = async () => {
    const hasChanges =
      collectionName !== collection.name ||
      collectionDescription !== collection.description ||
      collectionTrade !== collection.categorySelection?.trade;

    if (hasChanges && collection.id) {
      await updateCollectionMetadata(collection.id, {
        name: collectionName,
        description: collectionDescription,
        categorySelection: {
          ...collection.categorySelection,
          trade: collectionTrade
        }
      });
    }
    setIsEditing(false);
  };

  // Get current tab data
  const getCurrentTabData = () => {
    if (activeView === 'summary') {
      return { items: [], selections: {}, isLoading: false, loadError: null, tabs: [] };
    }

    const currentTabs = tabs.getLocalTabs(activeContentType);
    const currentItems = items.getItems(activeContentType);
    const currentSelections = selections.getSelections(activeContentType);
    const isLoading = items.getIsLoading(activeContentType);
    const loadError = items.getLoadError(activeContentType);

    if (activeCategoryTabIndex === 0) {
      return {
        items: currentItems.filter(item => currentSelections[item.id]?.isSelected),
        selections: currentSelections,
        isLoading,
        loadError,
        tabs: currentTabs,
      };
    } else {
      const currentTab = currentTabs?.[activeCategoryTabIndex - 1];
      if (!currentTab) return { items: [], selections: currentSelections, isLoading, loadError, tabs: currentTabs };

      return {
        items: currentItems.filter(item => currentTab.itemIds.includes(item.id)),
        selections: currentSelections,
        isLoading,
        loadError,
        tabs: currentTabs,
      };
    }
  };

  const { items: currentItems, selections: currentSelections, isLoading, loadError, tabs: currentTabs } = getCurrentTabData();
  const currentTab = activeCategoryTabIndex > 0 ? currentTabs?.[activeCategoryTabIndex - 1] : null;

  const availableLocations = useMemo(() => {
    if (activeView === 'summary') return [];
    const locations = new Set<string>();
    currentItems.forEach(item => {
      if (item.location) locations.add(item.location);
    });
    return Array.from(locations).sort();
  }, [activeView, currentItems]);

  // Get unsaved flag for active content type
  const hasUnsavedChanges =
    activeView === 'products' ? selections.hasUnsavedProductChanges :
    activeView === 'labor' ? selections.hasUnsavedLaborChanges :
    activeView === 'tools' ? selections.hasUnsavedToolChanges :
    activeView === 'equipment' ? selections.hasUnsavedEquipmentChanges :
    false;

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
      {saveError && (
        <div className="fixed top-16 right-4 z-40 max-w-md">
<Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">Save Error</p>
              <p className="text-sm">{saveError}</p>
              <button onClick={clearError} className="text-xs underline mt-1">
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

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

      <CollectionHeader
        collectionName={collectionName}
        description={collectionDescription}
        trade={collectionTrade}
        isEditing={isEditing}
        onBack={onBack}
        onEdit={handleEdit}
        onSave={handleSaveMetadata}
        onCancel={handleCancel}
        onDelete={onDelete}
        onNameChange={setCollectionName}
        onDescriptionChange={setCollectionDescription}
        onTradeChange={setCollectionTrade}
        onOptionsClick={() => setShowTaxModal(true)}
        onRefreshItems={handleRefreshItems}
        isRefreshing={isRefreshingItems}
        onSaveChanges={handleSaveChanges}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        activeView={activeView}
      />

      <CollectionTopTabBar
        activeView={activeView}
        collection={collection}
        onViewChange={setActiveView}
        unsavedChanges={{
          products: selections.hasUnsavedProductChanges,
          labor: selections.hasUnsavedLaborChanges,
          tools: selections.hasUnsavedToolChanges,
          equipment: selections.hasUnsavedEquipmentChanges,
        }}
      />

      {activeView !== 'summary' && (
        <CollectionSearchFilter
          filterState={filterState}
          onFilterChange={setFilterState}
          availableLocations={availableLocations}
          isCollapsed={isFilterCollapsed}
          onToggleCollapse={() => setIsFilterCollapsed(!isFilterCollapsed)}
          isMasterTab={activeCategoryTabIndex === 0}
        />
      )}

      <div className={`flex-1 ${activeView === 'summary' ? '' : 'overflow-hidden'}`}>
        {activeView === 'summary' ? (
          <CollectionSummary
          collectionId={collection.id!}
          collectionName={collectionName}
          taxRate={taxRate}
          productCategoryTabs={collection.productCategoryTabs || []}
          allProducts={items.allProducts}
          productSelections={selections.productSelections}
          laborCategoryTabs={collection.laborCategoryTabs || []}
          allLaborItems={items.allLaborItems}
          laborSelections={selections.laborSelections}
          toolCategoryTabs={collection.toolCategoryTabs || []}
          allToolItems={items.allToolItems}
          toolSelections={selections.toolSelections}
          equipmentCategoryTabs={collection.equipmentCategoryTabs || []}
          allEquipmentItems={items.allEquipmentItems}
          equipmentSelections={selections.equipmentSelections}
        />
        ) : activeCategoryTabIndex === 0 ? (
          <MasterTabView
            collectionName={collectionName}
            taxRate={taxRate}
            activeContentType={activeContentType}
            productCategoryTabs={collection.productCategoryTabs || []}
            allProducts={items.allProducts}
            productSelections={selections.productSelections}
            laborCategoryTabs={collection.laborCategoryTabs || []}
            allLaborItems={items.allLaborItems}
            laborSelections={selections.laborSelections}
            toolCategoryTabs={collection.toolCategoryTabs || []}
            allToolItems={items.allToolItems}
            toolSelections={selections.toolSelections}
            equipmentCategoryTabs={collection.equipmentCategoryTabs || []}
            allEquipmentItems={items.allEquipmentItems}
            equipmentSelections={selections.equipmentSelections}
            onLaborHoursChange={handleLaborHoursChange}
            newlyAddedItemIds={newlyAddedItemIds}
          />
        ) : (
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
              onLaborHoursChange={handleLaborHoursChange}
              onRetry={() => items.loadItems(activeContentType, tabs.getLocalTabs(activeContentType))}
              filterState={filterState}
            />
          )
        )}
      </div>
    </div>
  );
};

export default CollectionsScreen;