// src/pages/collections/components/CollectionView.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import CollectionsScreen from './CollectionsScreen/CollectionsScreen';
import CategoryTabBar from './CategoryTabBar';
import TradeTabRow from './TradeTabRow';
import CollectionCategorySelector, { CategorySelection } from './CollectionCategorySelector';
import { deleteCollection, saveCollectionChanges, getProductsForCollectionTabs } from '../../../services/collections';
import type { ItemSelection, CategoryTab } from '../../../services/collections';
import { useAuthContext } from '../../../contexts/AuthContext';
import {
  useCollectionSubscription,
  useCollectionViewSelections,
  useUnsavedChangesWarning,
  useCategoryManagement,
  useCollectionViewState,
} from '../../../hooks/collections/collectionView';
import { useCollectionTabGroups } from '../../../hooks/collections/collectionsScreen';
import GroupingControlPanel from './CollectionsScreen/components/GroupingControlPanel';
import { updateCollectionMetadata } from '../../../services/collections';

const CollectionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const isSavingRef = useRef(false);
  const isSavingGroupingRef = useRef(false);

  // Custom hooks
  const { collection, loading, error } = useCollectionSubscription(id);
  const { liveSelections, setLiveSelections, syncSelectionsFromFirebase } = useCollectionViewSelections();
  const {
    unsavedChanges,
    hasAnyUnsavedChanges,
    handleUnsavedChanges,
    checkBeforeLeaving,
    pendingDeletions,
    togglePendingDeletion,
    clearPendingDeletions,
    hasPendingDeletions,
  } = useUnsavedChangesWarning();
  const { isUpdating, updateError, handleAddCategories, handleRemoveCategory, clearError } = useCategoryManagement();
  const {
    activeView,
    activeCategoryTabIndex,
    setActiveCategoryTabIndex,
    getCurrentTabsAndSelections,
    handleViewChange,
  } = useCollectionViewState();

  const [showGroupingPanel, setShowGroupingPanel] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);

  const [localTabs, setLocalTabs] = useState<{
    products: any[];
    labor: any[];
    tools: any[];
    equipment: any[];
  }>({
    products: [],
    labor: [],
    tools: [],
    equipment: [],
  });

  const tabGroups = useCollectionTabGroups({
    collection: collection || {
      id: '',
      name: '',
      category: '',
      categorySelection: { trade: '', sections: [], categories: [], subcategories: [] },
      assignedProducts: [],
      productCategoryTabs: [],
      laborCategoryTabs: [],
      toolCategoryTabs: [],
      equipmentCategoryTabs: [],
      productSelections: {},
      laborSelections: {},
      toolSelections: {},
      equipmentSelections: {},
      taxRate: 0.07,
    },
    onSave: async (preferences) => {
      if (collection?.id) {
        isSavingGroupingRef.current = true;
        try {
          await updateCollectionMetadata(collection.id, {
            tabGroupingPreferences: preferences
          });
        } finally {
          setTimeout(() => {
            isSavingGroupingRef.current = false;
          }, 2000);
        }
      }
    }
  });

  const isAddingCategoriesRef = useRef(false);
  const backfilledTradeNamesRef = useRef(false);
  const isBackfillingTradeNamesRef = useRef(false);

  // One-time backfill: older collections have productCategoryTabs saved before
  // tradeName existed on CategoryTab. Resolve tradeName from each tab's items
  // and persist it so the Trade row can group them correctly going forward.
  useEffect(() => {
    console.log('🔍 [TradeBackfill] effect fired', {
      collectionId: collection?.id,
      alreadyRan: backfilledTradeNamesRef.current,
    });

    if (!collection?.id || backfilledTradeNamesRef.current) return;

    const productTabs = collection.productCategoryTabs || [];
    const tabsMissingTrade = productTabs.filter(
      tab => !tab.tradeName && tab.itemIds.length > 0
    );

    console.log('🔍 [TradeBackfill] scan result', {
      totalProductTabs: productTabs.length,
      tabsMissingTrade: tabsMissingTrade.length,
      sampleTab: productTabs[0],
    });

    if (tabsMissingTrade.length === 0) {
      console.log('🔍 [TradeBackfill] nothing to backfill — either all tabs have tradeName, or there are no product tabs');
      return;
    }

    backfilledTradeNamesRef.current = true;
    isBackfillingTradeNamesRef.current = true;

    (async () => {
      try {
        const allItemIds = Array.from(
          new Set(tabsMissingTrade.flatMap(tab => tab.itemIds))
        );
        console.log('🔍 [TradeBackfill] fetching products for ids:', allItemIds);

        const result = await getProductsForCollectionTabs(allItemIds);
        console.log('🔍 [TradeBackfill] getProductsForCollectionTabs result:', result);

        if (!result.success || !result.data) {
          console.log('🔍 [TradeBackfill] fetch failed or returned no data, aborting');
          return;
        }

        const tradeByProductId = new Map<string, string>();
        result.data.forEach((product: any) => {
          if (product.id && product.trade) tradeByProductId.set(product.id, product.trade);
        });

        console.log('🔍 [TradeBackfill] resolved trade map:', Array.from(tradeByProductId.entries()));

        const backfilledTabs: CategoryTab[] = productTabs.map(tab => {
          if (tab.tradeName) return tab;
          const tradeName = tab.itemIds.map(id => tradeByProductId.get(id)).find(Boolean);
          return tradeName ? { ...tab, tradeName } : tab;
        });

        const didChange = backfilledTabs.some((tab, i) => tab.tradeName !== productTabs[i].tradeName);
        console.log('🔍 [TradeBackfill] didChange:', didChange, 'backfilledTabs:', backfilledTabs);

        if (!didChange) {
          console.log('🔍 [TradeBackfill] no tradeName could be resolved for any tab (products missing `trade` field?) — aborting save');
          return;
        }

        setLocalTabs(prev => ({ ...prev, products: backfilledTabs }));
        console.log('🔍 [TradeBackfill] saving backfilled tabs to Firestore...');
        const saveResult = await saveCollectionChanges(collection.id!, { productCategoryTabs: backfilledTabs });
        console.log('🔍 [TradeBackfill] save result:', saveResult);
      } finally {
        isBackfillingTradeNamesRef.current = false;
      }
    })();
  }, [collection?.id, collection?.productCategoryTabs]);

  // Sync local tabs from Firebase collection when it changes
  useEffect(() => {
    if (collection && !isAddingCategoriesRef.current && !isSavingRef.current && !isSavingGroupingRef.current && !isBackfillingTradeNamesRef.current) {
      setLocalTabs({
        products: collection.productCategoryTabs || [],
        labor: collection.laborCategoryTabs || [],
        tools: collection.toolCategoryTabs || [],
        equipment: collection.equipmentCategoryTabs || [],
      });
    }
  }, [collection]);

  // Sync selections when collection changes (but not during category addition)
  useEffect(() => {
    if (collection && !isAddingCategoriesRef.current) {
      console.log('🔄 [CollectionView] Syncing selections from Firebase');
      syncSelectionsFromFirebase(collection);
    } else if (isAddingCategoriesRef.current) {
      console.log('⏸️ [CollectionView] Skipping Firebase sync - category addition in progress');
    }
  }, [collection, syncSelectionsFromFirebase]);

  const handleDelete = async () => {
    if (!collection?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${collection.name}"?`)) return;

    try {
      const result = await deleteCollection(collection.id);
      if (result.success) {
        navigate('/collections/list');
      } else {
        console.error(result.error?.message || 'Failed to delete collection');
      }
    } catch (err) {
      console.error('An unexpected error occurred while deleting collection', err);
    }
  };

  const handleBack = () => {
    if (checkBeforeLeaving()) {
      navigate('/collections/list');
    }
  };

  const handleCategoryEditComplete = async (newSelection: CategorySelection) => {
    if (!collection?.id || !currentUser || activeView === 'summary') return;

    isAddingCategoriesRef.current = true;

    const result = await handleAddCategories(
      collection,
      newSelection,
      activeView,
      currentUser.uid,
      liveSelections[activeView]
    );

    if (result) {
      const newTabs = activeView === 'products' ? result.updatedCollection.productCategoryTabs :
        activeView === 'labor' ? result.updatedCollection.laborCategoryTabs :
          activeView === 'tools' ? result.updatedCollection.toolCategoryTabs :
            result.updatedCollection.equipmentCategoryTabs;

      setLiveSelections(prev => ({
        ...prev,
        [activeView]: { ...prev[activeView], ...result.newSelections }
      }));

      setLocalTabs(prev => ({ ...prev, [activeView]: newTabs || [] }));

      if ((window as any).__updateCollectionTabsLocal) {
        (window as any).__updateCollectionTabsLocal(activeView, result.updatedCollection);
      }
      setLocalTabs(prev => ({ ...prev, [activeView]: newTabs || [] }));
      setActiveCategoryTabIndex(newTabs?.length ?? 0);
      handleUnsavedChanges(true, activeView);

      setTimeout(() => {
        isAddingCategoriesRef.current = false;
      }, 1000);
    }

    setShowCategoryEditor(false);
  };

  const handleTogglePendingDeletion = useCallback((tabId: string) => {
    if (activeView === 'summary') return;
    togglePendingDeletion(activeView, tabId);
  }, [activeView, togglePendingDeletion]);

  const handleSaveChanges = useCallback(async (
    localProductTabs: any[],
    localLaborTabs: any[],
    localToolTabs: any[],
    localEquipmentTabs: any[],
    productSelections: Record<string, ItemSelection>,
    laborSelections: Record<string, ItemSelection>,
    toolSelections: Record<string, ItemSelection>,
    equipmentSelections: Record<string, ItemSelection>,
  ) => {
    if (!collection?.id || activeView === 'summary') return;

    const currentPending = pendingDeletions[activeView];

    console.log('💾 [CollectionView handleSaveChanges] pendingDeletions:', currentPending);
    console.log('💾 [CollectionView handleSaveChanges] size:', currentPending.size);
    console.log('💾 [CollectionView handleSaveChanges] contents:', [...currentPending]);

    const filterTabs = (tabList: any[]) =>
      tabList.filter(t => !currentPending.has(t.id));

    const filterSelections = (sels: Record<string, ItemSelection>) =>
      Object.fromEntries(
        Object.entries(sels).filter(([, sel]) => !currentPending.has(sel.categoryTabId))
      );

    const filteredEquipmentTabs = filterTabs(localEquipmentTabs);
    console.log('💾 [CollectionView handleSaveChanges] equipment tabs before:', localEquipmentTabs.length, 'after:', filteredEquipmentTabs.length);

    isSavingRef.current = true;

    try {
      const result = await saveCollectionChanges(collection.id, {
        productCategoryTabs: filterTabs(localProductTabs),
        productSelections: filterSelections(productSelections),
        laborCategoryTabs: filterTabs(localLaborTabs),
        laborSelections: filterSelections(laborSelections),
        toolCategoryTabs: filterTabs(localToolTabs),
        toolSelections: filterSelections(toolSelections),
        equipmentCategoryTabs: filteredEquipmentTabs,
        equipmentSelections: filterSelections(equipmentSelections),
        categorySelection: collection.categorySelection,
      });

      if (result.success) {
        console.log('✅ [CollectionView handleSaveChanges] Save successful');
        clearPendingDeletions(activeView);
        handleUnsavedChanges(false, activeView);

        const filteredLocal = {
          products: filterTabs(localProductTabs),
          labor: filterTabs(localLaborTabs),
          tools: filterTabs(localToolTabs),
          equipment: filterTabs(localEquipmentTabs),
        };
        setLocalTabs(filteredLocal);
        const remainingCount = filteredLocal[activeView as keyof typeof filteredLocal].length;
        if (remainingCount === 0) {
          setActiveCategoryTabIndex(0);
        }

        const currentTab = filteredLocal[activeView as keyof typeof filteredLocal][activeCategoryTabIndex - 1];
        if (!currentTab) {
          const remaining = filteredLocal[activeView as keyof typeof filteredLocal];
          setActiveCategoryTabIndex(remaining.length > 0 ? remaining.length : 0);
        }

        if ((window as any).__updateCollectionTabsAfterSave) {
          const updatedCollectionShape = {
            ...collection,
            productCategoryTabs: filteredLocal.products,
            laborCategoryTabs: filteredLocal.labor,
            toolCategoryTabs: filteredLocal.tools,
            equipmentCategoryTabs: filteredLocal.equipment,
            productSelections: filterSelections(liveSelections.products),
            laborSelections: filterSelections(liveSelections.labor),
            toolSelections: filterSelections(liveSelections.tools),
            equipmentSelections: filterSelections(liveSelections.equipment),
          };
          (window as any).__updateCollectionTabsAfterSave(activeView, updatedCollectionShape);
        }
      } else {
        console.error('❌ [CollectionView handleSaveChanges] Save failed:', result.error);
      }
    } catch (err) {
      console.error('❌ [CollectionView handleSaveChanges] Exception:', err);
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 2000);
    }
  }, [collection, activeView, pendingDeletions, clearPendingDeletions, handleUnsavedChanges]);

  const getCurrentCategorySelection = (): CategorySelection => {
    if (!collection) {
      return { trade: '', sections: [], categories: [], subcategories: [], types: [], description: '' };
    }
    return {
      trade: collection.categorySelection?.trade || '',
      sections: collection.categorySelection?.sections || [],
      categories: collection.categorySelection?.categories || [],
      subcategories: collection.categorySelection?.subcategories || [],
      types: collection.categorySelection?.types || [],
      description: collection.categorySelection?.description || ''
    };
  };

  const getCurrentTabs = () => {
    if (activeView === 'summary') return [];
    switch (activeView) {
      case 'products': return localTabs.products;
      case 'labor': return localTabs.labor;
      case 'tools': return localTabs.tools;
      case 'equipment': return localTabs.equipment;
      default: return [];
    }
  };

  const currentCategoryTabs = getCurrentTabs();
  const currentSelections = activeView !== 'summary' ? liveSelections[activeView] : {};

  const UNASSIGNED_TRADE = '__unassigned__';
  const hasSyncedInitialTradeRef = useRef(false);

  // Keep the Trade row in sync with whichever tab is actually active (e.g. after
  // returning to the collection with activeCategoryTabIndex already restored from a
  // prior session), so the selected trade always reflects the active category/section.
  // Only runs once per mount, before any trade has been resolved this session — once
  // selectedTrade is set, indices are relative to the already-filtered list and this
  // full-list lookup would no longer line up.
  useEffect(() => {
    if (activeView !== 'products' || hasSyncedInitialTradeRef.current || selectedTrade !== null) return;
    const tabs = currentCategoryTabs.filter(tab => tab.type === 'products');
    if (tabs.length === 0) return;

    const activeTab = activeCategoryTabIndex > 0 ? tabs[activeCategoryTabIndex - 1] : undefined;
    const activeTrade = activeTab ? (activeTab.tradeName || UNASSIGNED_TRADE) : undefined;

    if (activeTrade) {
      console.log('🔍 [TradeSync] restoring selectedTrade from active tab on mount', {
        activeCategoryTabIndex,
        activeTabCategory: activeTab?.category,
        activeTrade,
      });
      hasSyncedInitialTradeRef.current = true;
      setSelectedTrade(activeTrade);
    }
  }, [activeView, currentCategoryTabs, activeCategoryTabIndex, selectedTrade]);

  const tradeFilteredCategoryTabs = React.useMemo(() => {
    if (activeView !== 'products') return currentCategoryTabs;

    const tabs = currentCategoryTabs.filter(tab => tab.type === activeView);
    const trades = Array.from(new Set(tabs.map(tab => tab.tradeName || UNASSIGNED_TRADE)));

    if (trades.length <= 1) return currentCategoryTabs;

    const effectiveTrade = selectedTrade ?? trades[0];
    return currentCategoryTabs.filter(
      tab => (tab.tradeName || UNASSIGNED_TRADE) === effectiveTrade
    );
  }, [currentCategoryTabs, activeView, selectedTrade]);

  // Keep the Trade row highlighted in sync with whichever category/section tab is
  // active, so selecting a tab in CategoryTabBar also highlights its trade above —
  // the two rows should always agree on which trade is "current". activeCategoryTabIndex
  // is an index into tradeFilteredCategoryTabs (what CategoryTabBar is actually given),
  // not the unfiltered currentCategoryTabs — indexing the wrong list picks an unrelated
  // tab and can flip selectedTrade to some other trade entirely.
  useEffect(() => {
    if (activeView !== 'products' || activeCategoryTabIndex === 0) return;
    const tabs = tradeFilteredCategoryTabs.filter(tab => tab.type === 'products');
    const activeTab = tabs[activeCategoryTabIndex - 1];
    if (!activeTab) return;

    const activeTrade = activeTab.tradeName || UNASSIGNED_TRADE;
    if (activeTrade !== selectedTrade) {
      hasSyncedInitialTradeRef.current = true;
      setSelectedTrade(activeTrade);
    }
  }, [activeView, tradeFilteredCategoryTabs, activeCategoryTabIndex, selectedTrade]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2" />
          <p className="text-gray-500">Loading collection...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Collection not found'}
          </h2>
          <button
            onClick={() => navigate('/collections/list')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Collections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 min-h-0 overflow-hidden">
      <CollectionsScreen
        collection={collection}
        onBack={handleBack}
        onDelete={handleDelete}
        activeCategoryTabIndex={activeCategoryTabIndex}
        onCategoryTabChange={setActiveCategoryTabIndex}
        onSelectionsChange={setLiveSelections}
        activeView={activeView}
        onViewChange={(view) => {
          setSelectedTrade(null);
          hasSyncedInitialTradeRef.current = false;
          handleViewChange(view, collection);
        }}
        onRefreshItems={() => { }}
        isRefreshingItems={false}
        newlyAddedItemIds={new Set()}
        onHasUnsavedChanges={handleUnsavedChanges}
        hasPendingDeletions={activeView !== 'summary' && hasPendingDeletions(activeView)}
        onSaveChanges={handleSaveChanges}
        onSaveComplete={() => {
          handleUnsavedChanges(false, activeView === 'summary' ? 'products' : activeView);
        }}
        onTabsUpdated={(contentType, updatedCollection) => {
          console.log('🔄 [CollectionView] onTabsUpdated called', { contentType });
        }}
      />
      </div>

      {activeView !== 'summary' && (
        <TradeTabRow
          contentType={activeView}
          categoryTabs={currentCategoryTabs}
          selectedTrade={selectedTrade}
          onTradeChange={(trade) => {
            hasSyncedInitialTradeRef.current = true;
            setSelectedTrade(trade);
            setActiveCategoryTabIndex(0);
          }}
        />
      )}

      {activeView !== 'summary' && (
        <CategoryTabBar
          collectionName={collection.name}
          contentType={activeView}
          categoryTabs={tradeFilteredCategoryTabs}
          activeTabIndex={activeCategoryTabIndex}
          selections={currentSelections}
          onTabChange={setActiveCategoryTabIndex}
          onAddCategories={() => setShowCategoryEditor(true)}
          pendingDeletions={activeView !== 'summary' ? pendingDeletions[activeView] : new Set()}
          onTogglePendingDeletion={handleTogglePendingDeletion}
          sectionGrouping={tabGroups.getCurrentGrouping(activeView)}
          onToggleSectionGroup={(sectionId) =>
            tabGroups.toggleSectionGroup(activeView, sectionId)
          }
          onOpenGroupingPanel={() => setShowGroupingPanel(true)}
        />
      )}

      {showCategoryEditor && activeView !== 'summary' && (
        <CollectionCategorySelector
          contentType={activeView}
          collectionName={collection.name}
          initialSelection={getCurrentCategorySelection()}
          onComplete={handleCategoryEditComplete}
          onClose={() => setShowCategoryEditor(false)}
          userId={currentUser?.uid || ''}
        />
      )}

      {isUpdating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
              <p className="text-gray-700 font-medium">Updating categories...</p>
            </div>
          </div>
        </div>
      )}

      {updateError && !isUpdating && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md z-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Update Failed</h3>
              <p className="text-sm text-red-700 mt-1">{updateError}</p>
            </div>
            <button
              onClick={clearError}
              className="flex-shrink-0 text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showGroupingPanel && activeView !== 'summary' && (
        <GroupingControlPanel
          contentType={activeView}
          availableSections={tabGroups.getGroupableSections(activeView, localTabs[activeView as keyof typeof localTabs])}
          groupingState={tabGroups.getCurrentGrouping(activeView)}
          onToggleSection={(sectionId) =>
            tabGroups.toggleSectionGroup(activeView, sectionId)
          }
          onCollapseAll={() => tabGroups.collapseAllSections(activeView, localTabs[activeView as keyof typeof localTabs])}
          onExpandAll={() => tabGroups.expandAllSections(activeView)}
          onClose={() => setShowGroupingPanel(false)}
        />
      )}
    </div>
  );
};

export default CollectionView;