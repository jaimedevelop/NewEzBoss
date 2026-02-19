// src/pages/collections/components/CollectionView.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import CollectionsScreen from './CollectionsScreen/CollectionsScreen';
import CategoryTabBar from './CategoryTabBar';
import CollectionCategorySelector, { CategorySelection } from './CollectionCategorySelector';
import { deleteCollection, saveCollectionChanges } from '../../../services/collections';
import type { ItemSelection } from '../../../services/collections';
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
        await updateCollectionMetadata(collection.id, {
          tabGroupingPreferences: preferences
        });
      }
    }
  });

  const isAddingCategoriesRef = useRef(false);

  // Sync local tabs from Firebase collection when it changes
  useEffect(() => {
    if (collection && !isAddingCategoriesRef.current && !isSavingRef.current) {
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
      setActiveCategoryTabIndex(newTabs?.length ?? 0); // last tab = newly added one
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

  // Save handler — lives here so it has direct access to pendingDeletions from the hook
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

        // Update local tabs state to reflect deletions immediately
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
          // Active tab was deleted — go to last remaining tab, or master if none
          const remaining = filteredLocal[activeView as keyof typeof filteredLocal];
          setActiveCategoryTabIndex(remaining.length > 0 ? remaining.length : 0);
        }

        // Notify CollectionsScreen to update its internal tab/selection state
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
      <CollectionsScreen
        collection={collection}
        onBack={handleBack}
        onDelete={handleDelete}
        activeCategoryTabIndex={activeCategoryTabIndex}
        onCategoryTabChange={setActiveCategoryTabIndex}
        onSelectionsChange={setLiveSelections}
        activeView={activeView}
        onViewChange={(view) => handleViewChange(view, collection)}
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

      {activeView !== 'summary' && (
        <CategoryTabBar
          collectionName={collection.name}
          contentType={activeView}
          categoryTabs={currentCategoryTabs}
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
          availableSections={tabGroups.getGroupableSections(activeView)}
          groupingState={tabGroups.getCurrentGrouping(activeView)}
          onToggleSection={(sectionId) =>
            tabGroups.toggleSectionGroup(activeView, sectionId)
          }
          onCollapseAll={() => tabGroups.collapseAllSections(activeView)}
          onExpandAll={() => tabGroups.expandAllSections(activeView)}
          onClose={() => setShowGroupingPanel(false)}
        />
      )}
    </div>
  );
};

export default CollectionView;