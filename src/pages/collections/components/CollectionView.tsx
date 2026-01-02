// src/pages/collections/components/CollectionView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import CollectionsScreen from './CollectionsScreen/CollectionsScreen';
import CategoryTabBar from './CategoryTabBar';
import CollectionCategorySelector, { CategorySelection } from './CollectionCategorySelector';
import { deleteCollection } from '../../../services/collections';
import { useAuthContext } from '../../../contexts/AuthContext';
import {
  useCollectionSubscription,
  useCollectionViewSelections,
  useUnsavedChangesWarning,
  useCategoryManagement,
  useCollectionViewState,
} from '../../../hooks/collections/collectionView';

const CollectionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();

  // Custom hooks
  const { collection, loading, error } = useCollectionSubscription(id);
  const { liveSelections, setLiveSelections, syncSelectionsFromFirebase } = useCollectionViewSelections();
  const { unsavedChanges, hasAnyUnsavedChanges, handleUnsavedChanges, checkBeforeLeaving } = useUnsavedChangesWarning();
  const { isUpdating, updateError, handleAddCategories, handleRemoveCategory, clearError } = useCategoryManagement();
  const {
    activeView,
    activeCategoryTabIndex,
    setActiveCategoryTabIndex,
    getCurrentTabsAndSelections,
    handleViewChange,
  } = useCollectionViewState();

  // Local UI state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  
  // Local tabs state - tracks tabs before they're saved to Firebase
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
  
  // Ref to prevent Firebase sync during category addition
  const isAddingCategoriesRef = useRef(false);

  // Sync local tabs from Firebase collection when it changes
  useEffect(() => {
    if (collection && !isAddingCategoriesRef.current) {
      console.log('🔄 [CollectionView] Syncing tabs from Firebase');
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

  // Handlers
  const handleDelete = async () => {
    if (!collection?.id) return;

    if (!window.confirm(`Are you sure you want to delete "${collection.name}"?`)) {
      return;
    }

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
  console.log('🔵 [CollectionView] handleCategoryEditComplete called', {
    collectionId: collection?.id,
    hasCurrentUser: !!currentUser,
    activeView,
    newSelection
  });

  if (!collection?.id || !currentUser || activeView === 'summary') {
    console.log('❌ [CollectionView] Early return', {
      hasCollectionId: !!collection?.id,
      hasCurrentUser: !!currentUser,
      activeView
    });
    return;
  }

  // Set flag to prevent Firebase sync from overwriting our changes
  isAddingCategoriesRef.current = true;
  console.log('🔒 [CollectionView] Category addition started - Firebase sync paused');

  console.log('🟡 [CollectionView] Calling handleAddCategories...');
  const result = await handleAddCategories(
    collection,
    newSelection,
    activeView,
    currentUser.uid,
    liveSelections[activeView]
  );

  console.log('🟢 [CollectionView] handleAddCategories result:', result);

  if (result) {
    // Get tab count from the updated collection, not from result
    const newTabs = activeView === 'products' ? result.updatedCollection.productCategoryTabs :
      activeView === 'labor' ? result.updatedCollection.laborCategoryTabs :
        activeView === 'tools' ? result.updatedCollection.toolCategoryTabs :
          result.updatedCollection.equipmentCategoryTabs;

    console.log('✅ [CollectionView] Updating local state with new selections', {
      newTabsCount: newTabs?.length,
      newSelectionsCount: Object.keys(result.newSelections || {}).length
    });

    // Update local state with new selections
    setLiveSelections(prev => ({
      ...prev,
      [activeView]: {
        ...prev[activeView],
        ...result.newSelections
      }
    }));

    // ✅ UPDATE LOCAL TABS STATE
    console.log('📋 [CollectionView] Updating local tabs state', {
      contentType: activeView,
      newTabsCount: newTabs?.length
    });
    
    setLocalTabs(prev => ({
      ...prev,
      [activeView]: newTabs || []
    }));

    // ✅ UPDATE TABS IN COLLECTIONSSCREEN
    console.log('📤 [CollectionView] Calling window.__updateCollectionTabs', {
      contentType: activeView,
      updatedCollection: result.updatedCollection
    });
    
    if ((window as any).__updateCollectionTabs) {
      (window as any).__updateCollectionTabs(activeView, result.updatedCollection);
    } else {
      console.warn('⚠️ [CollectionView] window.__updateCollectionTabs not available yet');
    }

    setActiveCategoryTabIndex(0);

    // Mark as unsaved
    handleUnsavedChanges(true, activeView);
    
    // Allow Firebase sync after a delay to let state settle
    setTimeout(() => {
      isAddingCategoriesRef.current = false;
      console.log('🔓 [CollectionView] Category addition complete - Firebase sync resumed');
    }, 1000);
  } else {
    console.log('⚠️ [CollectionView] No result from handleAddCategories');
  }

  setShowCategoryEditor(false);
};

  const handleRemoveCategoryWrapper = async (categoryTabId: string) => {
    if (!collection?.id || activeView === 'summary') return;

    console.log('🗑️ [CollectionView] handleRemoveCategoryWrapper called', {
      categoryTabId,
      activeView,
      collectionId: collection.id
    });

    const updatedCollection = handleRemoveCategory(collection, categoryTabId, activeView);

    if (updatedCollection) {
      console.log('✅ [CollectionView] Category removed, updating local state');

      // Get updated tabs from the collection
      const updatedTabs = activeView === 'products' ? updatedCollection.productCategoryTabs :
        activeView === 'labor' ? updatedCollection.laborCategoryTabs :
          activeView === 'tools' ? updatedCollection.toolCategoryTabs :
            updatedCollection.equipmentCategoryTabs;

      console.log('📋 [CollectionView] Updated tabs count:', updatedTabs?.length);

      // Update local tabs state
      setLocalTabs(prev => ({
        ...prev,
        [activeView]: updatedTabs || []
      }));

      // Sync all selections from the updated collection
      syncSelectionsFromFirebase(updatedCollection);

      // Update tabs in CollectionsScreen
      if ((window as any).__updateCollectionTabs) {
        console.log('📤 [CollectionView] Calling window.__updateCollectionTabs after removal');
        (window as any).__updateCollectionTabs(activeView, updatedCollection);
      } else {
        console.warn('⚠️ [CollectionView] window.__updateCollectionTabs not available');
      }

      // Mark as unsaved
      handleUnsavedChanges(true, activeView);

      // Adjust active tab index if needed
      const currentTabs = activeView === 'products' ? collection.productCategoryTabs :
        activeView === 'labor' ? collection.laborCategoryTabs :
          activeView === 'tools' ? collection.toolCategoryTabs :
            collection.equipmentCategoryTabs;

      const currentTabIndex = currentTabs?.findIndex(tab => tab.id === categoryTabId) ?? -1;
      if (currentTabIndex !== -1 && currentTabIndex + 1 >= (activeCategoryTabIndex || 1)) {
        setActiveCategoryTabIndex(Math.max(0, (activeCategoryTabIndex || 1) - 2));
      }
    } else {
      console.log('⚠️ [CollectionView] No updated collection returned from handleRemoveCategory');
    }
  };

  const getCurrentCategorySelection = (): CategorySelection => {
    if (!collection) {
      return {
        trade: '',
        sections: [],
        categories: [],
        subcategories: [],
        types: [],
        description: ''
      };
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

  // Get current tabs from local state (before save) or collection (after save)
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

  // Loading state
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

  // Error state
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
        onSaveComplete={() => {
          handleUnsavedChanges(false, activeView === 'summary' ? 'products' : activeView);
        }}
        onTabsUpdated={(contentType, updatedCollection) => {
          console.log('🔄 [CollectionView] onTabsUpdated called', { contentType });
          // This callback is just a signal - actual update happens via window.__updateCollectionTabs
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
          onRemoveCategory={handleRemoveCategoryWrapper}
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
    </div>
  );
};

export default CollectionView;