// src/pages/collections/components/CollectionView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import CollectionsScreen from './CollectionsScreen/CollectionsScreen';
import CategoryTabBar from './CategoryTabBar';
import CollectionCategorySelector, { CategorySelection } from './CollectionCategorySelector';
import { 
  Collection, 
  getCollection, 
  deleteCollection,
  updateCollectionCategories,
  type CategoryTab,
  type CollectionContentType,
  type ItemSelection,
} from '../../../services/collections';
import {
  getProductsByCategories,
  type InventoryProduct
} from '../../../services/inventory/products';
import {
  getLaborItems,
  type LaborItem
} from '../../../services/inventory/labor';
import {
  getTools,
  type ToolItem
} from '../../../services/inventory/tools';
import {
  getEquipment,
  type EquipmentItem
} from '../../../services/inventory/equipment';
import { useAuthContext } from '../../../contexts/AuthContext';

// ✅ NEW: Union type for view state
type CollectionViewType = 'summary' | CollectionContentType;

const CollectionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  
  // Collection state
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ UPDATED: View State (summary or specific content type)
  const [activeView, setActiveView] = useState<CollectionViewType>('summary');
  
  // Tab Persistence: Track last active tab for each content type
  const [tabIndexByType, setTabIndexByType] = useState<Record<CollectionContentType, number>>({
    products: 0,
    labor: 0,
    tools: 0,
    equipment: 0,
  });

  // ✅ UPDATED: Get active tab index based on current view
  const activeCategoryTabIndex = activeView === 'summary' ? 0 : tabIndexByType[activeView];
  
  const setActiveCategoryTabIndex = useCallback((index: number) => {
    if (activeView !== 'summary') {
      setTabIndexByType(prev => ({
        ...prev,
        [activeView]: index,
      }));
    }
  }, [activeView]);

  // Category editing state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Live selections state
  const [liveSelections, setLiveSelections] = useState({
    products: {} as Record<string, ItemSelection>,
    labor: {} as Record<string, ItemSelection>,
    tools: {} as Record<string, ItemSelection>,
    equipment: {} as Record<string, ItemSelection>,
  });

  useEffect(() => {
    if (id) {
      loadCollection(id);
    }
  }, [id]);

  // Initialize selections when collection loads
  useEffect(() => {
    if (collection) {
      setLiveSelections({
        products: collection.productSelections || {},
        labor: collection.laborSelections || {},
        tools: collection.toolSelections || {},
        equipment: collection.equipmentSelections || {},
      });
    }
  }, [collection?.id]);

  const loadCollection = async (collectionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCollection(collectionId);
      if (result.success && result.data) {
        setCollection(result.data);
      } else {
        setError(result.error?.message || 'Collection not found');
      }
    } catch (err) {
      setError('Failed to load collection');
      console.error('Error loading collection:', err);
    } finally {
      setLoading(false);
    }
  };

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
        setError(result.error?.message || 'Failed to delete collection');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting collection');
      console.error('Error deleting collection:', err);
    }
  };

  const handleBack = () => {
    navigate('/collections/list');
  };

  // ✅ UPDATED: Handle view change (summary or content type)
  const handleViewChange = useCallback((view: CollectionViewType) => {
    setActiveView(view);
    
    // If switching to a content type with no tabs, reset to master tab
    if (view !== 'summary') {
      const tabs = view === 'products' ? collection?.productCategoryTabs :
                   view === 'labor' ? collection?.laborCategoryTabs :
                   view === 'tools' ? collection?.toolCategoryTabs :
                   collection?.equipmentCategoryTabs;
      
      if (!tabs || tabs.length === 0) {
        setActiveCategoryTabIndex(0);
      }
    }
  }, [collection, setActiveCategoryTabIndex]);

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

  // Helper function: Group products into category tabs
  const groupProductsIntoTabs = (products: InventoryProduct[]): CategoryTab[] => {
    const grouped = products.reduce((acc, product) => {
      const key = `${product.section}-${product.category}`;
      if (!acc[key]) {
        acc[key] = {
          section: product.section,
          category: product.category,
          products: []
        };
      }
      acc[key].products.push(product);
      return acc;
    }, {} as Record<string, { section: string; category: string; products: InventoryProduct[] }>);

    return Object.entries(grouped).map(([key, data]) => ({
      id: key,
      type: 'products' as CollectionContentType,
      name: data.category,
      section: data.section,
      category: data.category,
      subcategories: [...new Set(data.products.map(p => p.subcategory))],
      itemIds: data.products.map(p => p.id).filter(Boolean) as string[]
    }));
  };

  // Helper function: Group labor items into category tabs
  const groupLaborIntoTabs = (laborItems: LaborItem[]): CategoryTab[] => {
    const grouped = laborItems.reduce((acc, item) => {
      const section = item.sectionName || item.section;
      const category = item.categoryName || item.category;
      const key = `${section}-${category}`;
      
      if (!acc[key]) {
        acc[key] = {
          section,
          category,
          items: []
        };
      }
      acc[key].items.push(item);
      return acc;
    }, {} as Record<string, { section: string; category: string; items: LaborItem[] }>);

    return Object.entries(grouped).map(([key, data]) => ({
      id: key,
      type: 'labor' as CollectionContentType,
      name: data.category,
      section: data.section,
      category: data.category,
      subcategories: [],
      itemIds: data.items.map(item => item.id).filter(Boolean) as string[]
    }));
  };

  // Helper function: Group tools into category tabs
  const groupToolsIntoTabs = (toolItems: ToolItem[]): CategoryTab[] => {
    const grouped = toolItems.reduce((acc, item) => {
      const section = item.sectionName || item.section;
      const category = item.categoryName || item.category;
      const key = `${section}-${category}`;
      
      if (!acc[key]) {
        acc[key] = {
          section,
          category,
          subcategories: new Set<string>(),
          items: []
        };
      }
      if (item.subcategoryName || item.subcategory) {
        acc[key].subcategories.add(item.subcategoryName || item.subcategory);
      }
      acc[key].items.push(item);
      return acc;
    }, {} as Record<string, { section: string; category: string; subcategories: Set<string>; items: ToolItem[] }>);

    return Object.entries(grouped).map(([key, data]) => ({
      id: key,
      type: 'tools' as CollectionContentType,
      name: data.category,
      section: data.section,
      category: data.category,
      subcategories: Array.from(data.subcategories),
      itemIds: data.items.map(item => item.id).filter(Boolean) as string[]
    }));
  };

  // Helper function: Group equipment into category tabs
  const groupEquipmentIntoTabs = (equipmentItems: EquipmentItem[]): CategoryTab[] => {
    const grouped = equipmentItems.reduce((acc, item) => {
      const section = item.sectionName || item.section;
      const category = item.categoryName || item.category;
      const key = `${section}-${category}`;
      
      if (!acc[key]) {
        acc[key] = {
          section,
          category,
          subcategories: new Set<string>(),
          items: []
        };
      }
      if (item.subcategoryName || item.subcategory) {
        acc[key].subcategories.add(item.subcategoryName || item.subcategory);
      }
      acc[key].items.push(item);
      return acc;
    }, {} as Record<string, { section: string; category: string; subcategories: Set<string>; items: EquipmentItem[] }>);

    return Object.entries(grouped).map(([key, data]) => ({
      id: key,
      type: 'equipment' as CollectionContentType,
      name: data.category,
      section: data.section,
      category: data.category,
      subcategories: Array.from(data.subcategories),
      itemIds: data.items.map(item => item.id).filter(Boolean) as string[]
    }));
  };

  // Handle category selection completion
  const handleCategoryEditComplete = async (newSelection: CategorySelection) => {
    if (!collection?.id || !currentUser || activeView === 'summary') return;

    console.log('🔄 Updating collection categories:', newSelection);
    setIsUpdatingCategories(true);
    setShowCategoryEditor(false);
    setUpdateError(null);

    try {
      let newItems: any[] = [];
      let newTabs: CategoryTab[] = [];
      
      switch (activeView) {
        case 'products': {
          const result = await getProductsByCategories(newSelection, currentUser.uid);
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch products for new categories');
          }
          newItems = result.data;
          console.log(`📦 Fetched ${newItems.length} products`);
          
          if (newItems.length === 0) {
            setUpdateError('No products found for the selected categories. Please select categories that contain products.');
            setIsUpdatingCategories(false);
            return;
          }
          
          newTabs = groupProductsIntoTabs(newItems);
          break;
        }
        
        case 'labor': {
          const result = await getLaborItems(currentUser.uid, {}, 999);
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch labor items for new categories');
          }
          
          let allLabor = Array.isArray(result.data) ? result.data : result.data.laborItems || [];
          console.log(`💼 Fetched ${allLabor.length} total labor items`);
          
          newItems = allLabor.filter(labor => {
            const tradeMatch = !newSelection.trade || labor.tradeName === newSelection.trade;
            const sectionMatch = newSelection.sections.length === 0 || 
                                 newSelection.sections.includes(labor.sectionName);
            const categoryMatch = newSelection.categories.length === 0 || 
                                  newSelection.categories.includes(labor.categoryName);
            
            return tradeMatch && sectionMatch && categoryMatch;
          });
          
          console.log(`💼 Filtered to ${newItems.length} matching labor items`);
          
          if (newItems.length === 0) {
            setUpdateError('No labor items found for the selected categories. Please select categories that contain labor items.');
            setIsUpdatingCategories(false);
            return;
          }
          
          newTabs = groupLaborIntoTabs(newItems);
          break;
        }
        
        case 'tools': {
          const result = await getTools(currentUser.uid, {}, 999);
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch tools for new categories');
          }
          
          let allTools = result.data.tools || [];
          console.log(`🔧 Fetched ${allTools.length} total tools`);
          
          newItems = allTools.filter(tool => {
            const tradeMatch = !newSelection.trade || tool.tradeName === newSelection.trade;
            const sectionMatch = newSelection.sections.length === 0 || 
                                 newSelection.sections.includes(tool.sectionName);
            const categoryMatch = newSelection.categories.length === 0 || 
                                  newSelection.categories.includes(tool.categoryName);
            const subcategoryMatch = newSelection.subcategories.length === 0 || 
                                     newSelection.subcategories.includes(tool.subcategoryName);
            
            return tradeMatch && sectionMatch && categoryMatch && subcategoryMatch;
          });
          
          console.log(`🔧 Filtered to ${newItems.length} matching tools`);
          
          if (newItems.length === 0) {
            setUpdateError('No tools found for the selected categories. Please select categories that contain tools.');
            setIsUpdatingCategories(false);
            return;
          }
          
          newTabs = groupToolsIntoTabs(newItems);
          break;
        }
        
        case 'equipment': {
          const result = await getEquipment(currentUser.uid, {}, 999);
          if (!result.success || !result.data) {
            throw new Error('Failed to fetch equipment for new categories');
          }
          
          let allEquipment = result.data.equipment || [];
          console.log(`🚚 Fetched ${allEquipment.length} total equipment items`);
          
          newItems = allEquipment.filter(equipment => {
            const tradeMatch = !newSelection.trade || equipment.tradeName === newSelection.trade;
            const sectionMatch = newSelection.sections.length === 0 || 
                                 newSelection.sections.includes(equipment.sectionName);
            const categoryMatch = newSelection.categories.length === 0 || 
                                  newSelection.categories.includes(equipment.categoryName);
            const subcategoryMatch = newSelection.subcategories.length === 0 || 
                                     newSelection.subcategories.includes(equipment.subcategoryName);
            
            return tradeMatch && sectionMatch && categoryMatch && subcategoryMatch;
          });
          
          console.log(`🚚 Filtered to ${newItems.length} matching equipment items`);
          
          if (newItems.length === 0) {
            setUpdateError('No equipment found for the selected categories. Please select categories that contain equipment.');
            setIsUpdatingCategories(false);
            return;
          }
          
          newTabs = groupEquipmentIntoTabs(newItems);
          break;
        }
      }

      const existingTabsField = `${activeView}CategoryTabs` as keyof Collection;
      const existingSelectionsField = `${activeView}Selections` as keyof Collection;
      
      const existingTabs = (collection[existingTabsField] || []) as CategoryTab[];
      const existingSelections = (collection[existingSelectionsField] || {}) as Record<string, ItemSelection>;
      
      const existingTabsMap = new Map(
        existingTabs.map(tab => [`${tab.section}-${tab.category}`, tab])
      );
      
      const mergedTabs = [...existingTabs];
      newTabs.forEach(newTab => {
        const key = `${newTab.section}-${newTab.category}`;
        if (!existingTabsMap.has(key)) {
          mergedTabs.push(newTab);
        }
      });

      const mergedSelections = { ...existingSelections };
      
      newItems.forEach(item => {
        if (item.id && !mergedSelections[item.id]) {
          const itemTab = mergedTabs.find(tab =>
            tab.section === (item.sectionName || item.section) &&
            tab.category === (item.categoryName || item.category)
          );
          
          if (itemTab) {
            mergedSelections[item.id] = {
              isSelected: false,
              quantity: 1,
              categoryTabId: itemTab.id,
              addedAt: Date.now(),
              itemName: item.name,
              itemSku: item.sku || '',
              unitPrice: item.unitPrice || 0
            };
          }
        }
      });

      const existingCategorySelection = collection.categorySelection || {
        trade: '',
        sections: [],
        categories: [],
        subcategories: [],
        types: [],
      };

      const mergedCategorySelection: CategorySelection = {
        trade: existingCategorySelection.trade || newSelection.trade,
        sections: [
          ...new Set([
            ...(existingCategorySelection.sections || []),
            ...newSelection.sections
          ])
        ],
        categories: [
          ...new Set([
            ...(existingCategorySelection.categories || []),
            ...newSelection.categories
          ])
        ],
        subcategories: [
          ...new Set([
            ...(existingCategorySelection.subcategories || []),
            ...newSelection.subcategories
          ])
        ],
        types: [
          ...new Set([
            ...(existingCategorySelection.types || []),
            ...newSelection.types
          ])
        ],
        description: newSelection.description || existingCategorySelection.description
      };

      const updateData: Partial<Collection> = {
        categorySelection: mergedCategorySelection,
      };

      if (activeView === 'products') {
        updateData.productCategoryTabs = mergedTabs;
        updateData.productSelections = mergedSelections;
      } else if (activeView === 'labor') {
        updateData.laborCategoryTabs = mergedTabs;
        updateData.laborSelections = mergedSelections;
      } else if (activeView === 'tools') {
        updateData.toolCategoryTabs = mergedTabs;
        updateData.toolSelections = mergedSelections;
      } else if (activeView === 'equipment') {
        updateData.equipmentCategoryTabs = mergedTabs;
        updateData.equipmentSelections = mergedSelections;
      }

      console.log('📝 Update data:', updateData);

      const updateResult = await updateCollectionCategories(collection.id, updateData);

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update collection');
      }

      await loadCollection(collection.id);
      setActiveCategoryTabIndex(0);

    } catch (error) {
      console.error('❌ Error updating categories:', error);
      setUpdateError(
        error instanceof Error 
          ? error.message 
          : 'Failed to update categories. Please try again.'
      );
    } finally {
      setIsUpdatingCategories(false);
    }
  };

  // ✅ UPDATED: Get current tabs and selections (only when not on summary)
  const getCurrentTabsAndSelections = () => {
    if (!collection || activeView === 'summary') {
      return { tabs: [], selections: {} };
    }

    switch (activeView) {
      case 'products':
        return {
          tabs: collection.productCategoryTabs || [],
          selections: liveSelections.products,
        };
      case 'labor':
        return {
          tabs: collection.laborCategoryTabs || [],
          selections: liveSelections.labor,
        };
      case 'tools':
        return {
          tabs: collection.toolCategoryTabs || [],
          selections: liveSelections.tools,
        };
      case 'equipment':
        return {
          tabs: collection.equipmentCategoryTabs || [],
          selections: liveSelections.equipment,
        };
    }
  };

  const { tabs: currentCategoryTabs, selections: currentSelections } = getCurrentTabsAndSelections();

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
      {/* ✅ UPDATED: Pass activeView and handleViewChange */}
      <CollectionsScreen 
        collection={collection}
        onBack={handleBack}
        onDelete={handleDelete}
        activeCategoryTabIndex={activeCategoryTabIndex}
        onCategoryTabChange={setActiveCategoryTabIndex}
        onSelectionsChange={setLiveSelections}
        activeView={activeView}
        onViewChange={handleViewChange}
      />
      
      {/* ✅ UPDATED: Only show CategoryTabBar when NOT on summary view */}
      {activeView !== 'summary' && (
        <CategoryTabBar
          collectionName={collection.name}
          contentType={activeView}
          categoryTabs={currentCategoryTabs}
          activeTabIndex={activeCategoryTabIndex}
          selections={currentSelections}
          onTabChange={setActiveCategoryTabIndex}
          onAddCategories={() => setShowCategoryEditor(true)}
        />
      )}

      {/* ✅ UPDATED: Only show category editor when not on summary */}
      {showCategoryEditor && activeView !== 'summary' && (
        <CollectionCategorySelector
          contentType={activeView}
          collectionName={collection.name}
          initialSelection={getCurrentCategorySelection()}
          onComplete={handleCategoryEditComplete}
          onClose={() => setShowCategoryEditor(false)}
        />
      )}

      {/* Loading Overlay */}
      {isUpdatingCategories && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
              <p className="text-gray-700 font-medium">Updating categories...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {updateError && !isUpdatingCategories && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md z-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Update Failed</h3>
              <p className="text-sm text-red-700 mt-1">{updateError}</p>
            </div>
            <button
              onClick={() => setUpdateError(null)}
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