// src/pages/collections/components/CollectionsScreen/CollectionsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { updateCollectionMetadata } from '../../../../services/collections';
import type { Collection, CollectionContentType, ItemSelection } from '../../../../services/collections';
import {
  useCollectionSelections,
  useCollectionTabs,
  useCollectionItems,
  useCollectionSave
} from '../../../../hooks/collections/collectionsScreen';

import CollectionHeader from './components/CollectionHeader';
import CollectionSearchFilter from './components/CollectionSearchFilter';
import CollectionTopTabBar from './components/CollectionTopTabBar';
import CategoryTabBar from '../CategoryTabBar';
import MasterTabView from './components/MasterTabView';
import CategoryTabView from './components/CategoryTabView';
import CollectionSummary from './components/CollectionSummary';
import TaxConfigModal from './components/TaxConfigModal';
import { useCollectionTabGroups } from '../../../../hooks/collections/collectionsScreen';
import GroupingControlPanel from './components/GroupingControlPanel';
import SectionTabView from './components/SectionTabView';

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
  hasPendingDeletions?: boolean;
  onSaveChanges?: (
    localProductTabs: any[],
    localLaborTabs: any[],
    localToolTabs: any[],
    localEquipmentTabs: any[],
    productSelections: Record<string, ItemSelection>,
    laborSelections: Record<string, ItemSelection>,
    toolSelections: Record<string, ItemSelection>,
    equipmentSelections: Record<string, ItemSelection>,
  ) => Promise<void>;
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
  hasPendingDeletions = false,
  onSaveChanges,
}) => {
  const { currentUser } = useAuthContext();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

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
  const [showGroupingPanel, setShowGroupingPanel] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [collectionName, setCollectionName] = useState(collection?.name || 'New Collection');
  const [collectionDescription, setCollectionDescription] = useState(collection?.description || '');
  const [collectionTrade, setCollectionTrade] = useState(collection?.categorySelection?.trade || '');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxRate, setTaxRate] = useState(collection?.taxRate ?? 0.07);

  const [filterState, setFilterState] = useState({
    searchTerm: '',
    sizeFilter: '',
    stockFilter: '',
    locationFilter: '',
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  const selections = useCollectionSelections({
    initialProductSelections: collection?.productSelections || {},
    initialLaborSelections: collection?.laborSelections || {},
    initialToolSelections: collection?.toolSelections || {},
    initialEquipmentSelections: collection?.equipmentSelections || {},
  });

  const tabGroups = useCollectionTabGroups({
    collection,
    onSave: async (preferences) => {
      if (collection.id) {
        await updateCollectionMetadata(collection.id, {
          tabGroupingPreferences: preferences
        });
      }
    }
  });

  const tabs = useCollectionTabs({
    initialProductTabs: collection.productCategoryTabs || [],
    initialLaborTabs: collection.laborCategoryTabs || [],
    initialToolTabs: collection.toolCategoryTabs || [],
    initialEquipmentTabs: collection.equipmentCategoryTabs || [],
  });

  const items = useCollectionItems();
  const { saveError, handleSave, clearError } = useCollectionSave();
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if ((window as any).__justSaved) return;
    selections.syncFromFirebase('products', collection?.productSelections || {}, selections.hasUnsavedProductChanges);
  }, [collection?.productSelections]);

  useEffect(() => {
    if ((window as any).__justSaved) return;
    selections.syncFromFirebase('labor', collection?.laborSelections || {}, selections.hasUnsavedLaborChanges);
  }, [collection?.laborSelections]);

  useEffect(() => {
    if ((window as any).__justSaved) return;
    selections.syncFromFirebase('tools', collection?.toolSelections || {}, selections.hasUnsavedToolChanges);
  }, [collection?.toolSelections]);

  useEffect(() => {
    if ((window as any).__justSaved) return;
    selections.syncFromFirebase('equipment', collection?.equipmentSelections || {}, selections.hasUnsavedEquipmentChanges);
  }, [collection?.equipmentSelections]);

  useEffect(() => {
    if (onTabsUpdated) {
      // Called after a successful save — updates both local AND saved state so
      // hasUnsaved* resolves to false cleanly.
      (window as any).__updateCollectionTabsAfterSave = (contentType: CollectionContentType, updatedCollection: Collection) => {
        switch (contentType) {
          case 'products': {
            const newTabs = updatedCollection.productCategoryTabs || [];
            const newSels = updatedCollection.productSelections || {};
            tabs.updateLocalTabs('products', newTabs);
            tabs.markTabsAsSaved('products', newTabs);
            selections.updateSelections('products', () => newSels);
            selections.markAsSaved('products', newSels);
            break;
          }
          case 'labor': {
            const newTabs = updatedCollection.laborCategoryTabs || [];
            const newSels = updatedCollection.laborSelections || {};
            tabs.updateLocalTabs('labor', newTabs);
            tabs.markTabsAsSaved('labor', newTabs);
            selections.updateSelections('labor', () => newSels);
            selections.markAsSaved('labor', newSels);
            break;
          }
          case 'tools': {
            const newTabs = updatedCollection.toolCategoryTabs || [];
            const newSels = updatedCollection.toolSelections || {};
            tabs.updateLocalTabs('tools', newTabs);
            tabs.markTabsAsSaved('tools', newTabs);
            selections.updateSelections('tools', () => newSels);
            selections.markAsSaved('tools', newSels);
            break;
          }
          case 'equipment': {
            const newTabs = updatedCollection.equipmentCategoryTabs || [];
            const newSels = updatedCollection.equipmentSelections || {};
            tabs.updateLocalTabs('equipment', newTabs);
            tabs.markTabsAsSaved('equipment', newTabs);
            selections.updateSelections('equipment', () => newSels);
            selections.markAsSaved('equipment', newSels);
            break;
          }
        }
      };

      // Called after a category is added locally — updates ONLY local state so
      // the unsaved diff is preserved and the save button activates.
      (window as any).__updateCollectionTabsLocal = (contentType: CollectionContentType, updatedCollection: Collection) => {
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

  useEffect(() => {
    if (onHasUnsavedChanges) {
      onHasUnsavedChanges(
        selections.hasUnsavedProductChanges || tabs.hasUnsavedProductTabChanges,
        'products'
      );
      onHasUnsavedChanges(
        selections.hasUnsavedLaborChanges || tabs.hasUnsavedLaborTabChanges,
        'labor'
      );
      onHasUnsavedChanges(
        selections.hasUnsavedToolChanges || tabs.hasUnsavedToolTabChanges,
        'tools'
      );
      onHasUnsavedChanges(
        selections.hasUnsavedEquipmentChanges || tabs.hasUnsavedEquipmentTabChanges,
        'equipment'
      );
    }
  }, [
    selections.hasUnsavedProductChanges,
    selections.hasUnsavedLaborChanges,
    selections.hasUnsavedToolChanges,
    selections.hasUnsavedEquipmentChanges,
    tabs.hasUnsavedProductTabChanges,
    tabs.hasUnsavedLaborTabChanges,
    tabs.hasUnsavedToolTabChanges,
    tabs.hasUnsavedEquipmentTabChanges,
    onHasUnsavedChanges,
  ]);

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

  useEffect(() => {
    if (activeView === 'summary') {
      items.loadAllItems(
        tabs.localProductTabs,
        tabs.localLaborTabs,
        tabs.localToolTabs,
        tabs.localEquipmentTabs
      );
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'summary') {
      items.loadAllItems(
        tabs.localProductTabs,
        tabs.localLaborTabs,
        tabs.localToolTabs,
        tabs.localEquipmentTabs
      );
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
    collection.id,
    tabs.localProductTabs,
    tabs.localLaborTabs,
    tabs.localToolTabs,
    tabs.localEquipmentTabs,
  ]);

  // Delegates entirely to CollectionView (which owns pendingDeletions).
  // Does NOT call markAsSaved/markTabsAsSaved here — those are called inside
  // __updateCollectionTabs with explicit values, after the parent has computed
  // the post-save state, to avoid stale-closure snapshots.
  const handleSaveChanges = useCallback(async () => {
    if (!collection.id || activeView === 'summary') return;

    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    if (onSaveChanges) {
      setIsSaving(true);
      try {
        await onSaveChanges(
          tabs.localProductTabs,
          tabs.localLaborTabs,
          tabs.localToolTabs,
          tabs.localEquipmentTabs,
          selections.productSelections,
          selections.laborSelections,
          selections.toolSelections,
          selections.equipmentSelections,
        );
        onSaveComplete?.();

        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollPosition;
          }
        });
      } finally {
        setIsSaving(false);
      }
    }
  }, [collection.id, activeView, onSaveChanges, tabs, selections, onSaveComplete]);

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
        unitPrice: getPrice(),
      };

      if (item?.skus?.[0]?.sku || item?.sku) {
        newSelection.itemSku = item?.skus?.[0]?.sku || item?.sku;
      }

      if (activeContentType === 'labor' && item?.estimatedHours) {
        newSelection.estimatedHours = item.estimatedHours;
      }

      return { ...prev, [itemId]: newSelection };
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
      return { ...prev, [itemId]: { ...current, quantity } };
    });
  }, [activeView, activeContentType, selections]);

  const handleLaborHoursChange = useCallback((itemId: string, hours: number) => {
    if (activeView === 'summary' || activeContentType !== 'labor') return;

    selections.updateSelections('labor', prev => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: { ...current, estimatedHours: hours > 0 ? hours : undefined },
      };
    });
  }, [activeView, activeContentType, selections]);

  const handleRefreshItems = useCallback(async () => {
    if (activeView === 'summary' || !currentUser) return;
    items.clearItems(activeContentType);
    await items.loadItems(activeContentType, tabs.getLocalTabs(activeContentType));
  }, [activeView, activeContentType, currentUser, items, tabs]);

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

  const getCurrentTabData = () => {
    if (activeView === 'summary') {
      return { type: 'view' as const, items: [], selections: {}, isLoading: false, loadError: null, tabs: [] };
    }

    const currentTabs = tabs.getLocalTabs(activeContentType);
    const currentItems = items.getItems(activeContentType);
    const currentSelections = selections.getSelections(activeContentType);
    const isLoading = items.getIsLoading(activeContentType);
    const loadError = items.getLoadError(activeContentType);

    if (activeCategoryTabIndex > 0) {
      const currentTab = currentTabs?.[activeCategoryTabIndex - 1];
      const sectionGrouping = tabGroups.getCurrentGrouping(activeContentType);

      if (currentTab && sectionGrouping[currentTab.section]) {
        const sectionTabs = currentTabs.filter(t => t.section === currentTab.section);
        const allItemIds = new Set(sectionTabs.flatMap(t => t.itemIds));
        return {
          type: 'section' as const,
          items: currentItems.filter(item => allItemIds.has(item.id)),
          selections: currentSelections,
          tabs: sectionTabs,
          sectionId: currentTab.section,
          sectionName: currentTab.section,
          isLoading,
          loadError
        };
      }
    }

    if (activeCategoryTabIndex === 0) {
      return {
        type: 'master' as const,
        items: currentItems.filter(item => currentSelections[item.id]?.isSelected),
        selections: currentSelections,
        isLoading,
        loadError,
        tabs: currentTabs,
      };
    } else {
      const currentTab = currentTabs?.[activeCategoryTabIndex - 1];
      if (!currentTab) return {
        type: 'empty' as const,
        items: [],
        selections: currentSelections,
        isLoading,
        loadError,
        tabs: currentTabs
      };

      return {
        type: 'category' as const,
        items: currentItems.filter(item => currentTab.itemIds.includes(item.id)),
        selections: currentSelections,
        isLoading,
        loadError,
        tabs: currentTabs,
        currentTab,
      };
    }
  };

  const currentTabData = getCurrentTabData();
  const { items: currentItems, selections: currentSelections, isLoading, loadError, tabs: currentTabs } = getCurrentTabData();
  const currentTab = activeCategoryTabIndex > 0 ? currentTabs?.[activeCategoryTabIndex - 1] : null;

  const { tradeName, sectionName } = useMemo(() => {
    const tradeName = collection?.categorySelection?.trade;
    let sectionName = currentTab?.section;

    if (currentTab?.section && collection?.categorySelection?.sections) {
      const sections = collection.categorySelection.sections;
      if (Array.isArray(sections) && sections.length > 0 && typeof sections[0] !== 'string') {
        const sectionItem = (sections as any[]).find((s: any) =>
          s.sectionId === currentTab.section || s.name === currentTab.section
        );
        if (sectionItem) {
          sectionName = sectionItem.sectionName || sectionItem.name;
        }
      }
    }
    return { tradeName, sectionName };
  }, [collection?.categorySelection, currentTab?.section]);

  const availableLocations = useMemo(() => {
    if (activeView === 'summary') return [];
    const locations = new Set<string>();
    currentItems.forEach(item => {
      if (item.location) locations.add(item.location);
    });
    return Array.from(locations).sort();
  }, [activeView, currentItems]);

  const hasUnsavedChanges =
    activeView === 'products' ? (selections.hasUnsavedProductChanges || tabs.hasUnsavedProductTabChanges || hasPendingDeletions) :
      activeView === 'labor' ? (selections.hasUnsavedLaborChanges || tabs.hasUnsavedLaborTabChanges || hasPendingDeletions) :
        activeView === 'tools' ? (selections.hasUnsavedToolChanges || tabs.hasUnsavedToolTabChanges || hasPendingDeletions) :
          activeView === 'equipment' ? (selections.hasUnsavedEquipmentChanges || tabs.hasUnsavedEquipmentTabChanges || hasPendingDeletions) :
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
              <button onClick={clearError} className="text-xs underline mt-1">Dismiss</button>
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

      <div ref={scrollContainerRef} className={`flex-1 ${activeView === 'summary' ? '' : 'overflow-auto'}`}>
        {activeView === 'summary' ? (
          <CollectionSummary
            collectionId={collection.id!}
            collectionName={collectionName}
            taxRate={taxRate}
            savedCalculations={collection.calculations}
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
        ) : currentTabData.type === 'section' ? (
          <SectionTabView
            contentType={activeContentType}
            sectionName={currentTabData.sectionName!}
            categoryTabs={currentTabData.tabs}
            allItems={currentTabData.items}
            selections={currentTabData.selections}
            isLoading={currentTabData.isLoading}
            loadError={currentTabData.loadError}
            onToggleSelection={handleToggleSelection}
            onQuantityChange={handleQuantityChange}
            onLaborHoursChange={handleLaborHoursChange}
            filterState={filterState}
            onExpandSection={() => {
              const sectionId = currentTabData.sectionId!;
              tabGroups.toggleSectionGroup(activeContentType, sectionId);
            }}
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
              tradeName={tradeName}
              sectionName={sectionName}
            />
          )
        )}

        {showGroupingPanel && (
          <GroupingControlPanel
            contentType={activeContentType}
            availableSections={tabGroups.getGroupableSections(activeContentType, tabs.getLocalTabs(activeContentType))}
            groupingState={tabGroups.getCurrentGrouping(activeContentType)}
            onToggleSection={(sectionId) =>
              tabGroups.toggleSectionGroup(activeContentType, sectionId)
            }
            onCollapseAll={() => tabGroups.collapseAllSections(activeContentType, tabs.getLocalTabs(activeContentType))}
            onExpandAll={() => tabGroups.expandAllSections(activeContentType, tabs.getLocalTabs(activeContentType))}
            onClose={() => setShowGroupingPanel(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CollectionsScreen;