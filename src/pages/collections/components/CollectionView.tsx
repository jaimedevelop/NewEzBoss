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
import { matchesHierarchicalSelection } from '../../../utils/categoryMatching';

type CollectionViewType = 'summary' | CollectionContentType;

interface HierarchicalItem {
  name: string;
  tradeName: string;
  sectionName?: string;
  categoryName?: string;
  subcategoryName?: string;
}

interface HierarchicalCategoryItem {
  name: string;
  tradeId?: string;
  tradeName?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

interface HierarchicalCategorySelection {
  trade?: string;
  sections: HierarchicalItem[];
  categories: HierarchicalItem[];
  subcategories: HierarchicalItem[];
  types?: HierarchicalItem[];
  description?: string;
}

/**
 * Merge two arrays of category items (string[] or hierarchical objects)
 */
const mergeCategoryItems = (
  existing: string[] | HierarchicalCategoryItem[],
  newItems: string[] | HierarchicalCategoryItem[]
): string[] | HierarchicalCategoryItem[] => {
  const isStringArray = (arr: any[]): arr is string[] => {
    return arr.length === 0 || typeof arr[0] === 'string';
  };

  if (isStringArray(existing) && isStringArray(newItems)) {
    return Array.from(new Set([...existing, ...newItems]));
  }

  const existingObjects = existing as HierarchicalCategoryItem[];
  const newObjects = newItems as HierarchicalCategoryItem[];
  const itemMap = new Map<string, HierarchicalCategoryItem>();

  existingObjects.forEach(item => {
    const key = `${item.name}|${item.tradeName || ''}|${item.sectionName || ''}|${item.categoryName || ''}`;
    itemMap.set(key, item);
  });

  newObjects.forEach(item => {
    const key = `${item.name}|${item.tradeName || ''}|${item.sectionName || ''}|${item.categoryName || ''}`;
    if (!itemMap.has(key)) {
      itemMap.set(key, item);
    }
  });

  return Array.from(itemMap.values());
};

const CollectionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<CollectionViewType>('summary');
  
  const [tabIndexByType, setTabIndexByType] = useState<Record<CollectionContentType, number>>({
    products: 0,
    labor: 0,
    tools: 0,
    equipment: 0,
  });

  const activeCategoryTabIndex = activeView === 'summary' ? 0 : tabIndexByType[activeView];
  
  const setActiveCategoryTabIndex = useCallback((index: number) => {
    if (activeView !== 'summary') {
      setTabIndexByType(prev => ({
        ...prev,
        [activeView]: index,
      }));
    }
  }, [activeView]);

  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  const handleViewChange = useCallback((view: CollectionViewType) => {
    setActiveView(view);
    
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

  const handleCategoryEditComplete = async (newSelection: CategorySelection) => {
    if (!collection?.id || !currentUser || activeView === 'summary') return;

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
          
          if (newItems.length === 0) {
            console.warn(`⚠️ No ${activeView} items found for selected categories.`);
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
          newItems = allLabor.filter(labor => matchesHierarchicalSelection(labor, newSelection));
          
          if (newItems.length === 0) {
            console.warn(`⚠️ No ${activeView} items found for selected categories.`);
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
          newItems = allTools.filter(tool => matchesHierarchicalSelection(tool, newSelection));
          
          if (newItems.length === 0) {
            console.warn(`⚠️ No ${activeView} items found for selected categories.`);
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
          newItems = allEquipment.filter(equipment => matchesHierarchicalSelection(equipment, newSelection));
          
          if (newItems.length === 0) {
            console.warn(`⚠️ No ${activeView} items found for selected categories.`);
          }
          
          newTabs = groupEquipmentIntoTabs(newItems);
          break;
        }
      }

      let existingTabs: CategoryTab[] = [];
      let existingSelections: Record<string, ItemSelection> = {};

      switch (activeView) {
        case 'products':
          existingTabs = collection.productCategoryTabs || [];
          existingSelections = collection.productSelections || {};
          break;
        case 'labor':
          existingTabs = collection.laborCategoryTabs || [];
          existingSelections = collection.laborSelections || {};
          break;
        case 'tools':
          existingTabs = collection.toolCategoryTabs || [];
          existingSelections = collection.toolSelections || {};
          break;
        case 'equipment':
          existingTabs = collection.equipmentCategoryTabs || [];
          existingSelections = collection.equipmentSelections || {};
          break;
      }

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
        sections: mergeCategoryItems(
          existingCategorySelection.sections || [],
          newSelection.sections
        ) as any,
        categories: mergeCategoryItems(
          existingCategorySelection.categories || [],
          newSelection.categories
        ) as any,
        subcategories: mergeCategoryItems(
          existingCategorySelection.subcategories || [],
          newSelection.subcategories
        ) as any,
        types: mergeCategoryItems(
          existingCategorySelection.types || [],
          newSelection.types || []
        ) as any,
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

  const cleanCategorySelection = (
    categorySelection: CategorySelection,
    remainingTabs: CategoryTab[]
  ): CategorySelection => {
    const usedSections = new Set<string>();
    const usedCategories = new Set<string>();
    const usedSubcategories = new Set<string>();
    
    remainingTabs.forEach(tab => {
      if (tab.section) usedSections.add(tab.section);
      if (tab.category) usedCategories.add(tab.category);
      if (tab.subcategories) {
        tab.subcategories.forEach(sub => usedSubcategories.add(sub));
      }
    });
    
    return {
      trade: categorySelection.trade,
      sections: (categorySelection.sections || []).filter(s => usedSections.has(s)),
      categories: (categorySelection.categories || []).filter(c => usedCategories.has(c)),
      subcategories: (categorySelection.subcategories || []).filter(sc => usedSubcategories.has(sc)),
      types: categorySelection.types || [],
      description: categorySelection.description
    };
  };

  const handleRemoveCategory = async (categoryTabId: string) => {
    if (!collection?.id || activeView === 'summary') return;

    setIsUpdatingCategories(true);
    setUpdateError(null);

    try {
      let currentTabs: CategoryTab[] = [];
      let currentSelections: Record<string, ItemSelection> = {};
      
      switch (activeView) {
        case 'products':
          currentTabs = collection.productCategoryTabs || [];
          currentSelections = collection.productSelections || {};
          break;
        case 'labor':
          currentTabs = collection.laborCategoryTabs || [];
          currentSelections = collection.laborSelections || {};
          break;
        case 'tools':
          currentTabs = collection.toolCategoryTabs || [];
          currentSelections = collection.toolSelections || {};
          break;
        case 'equipment':
          currentTabs = collection.equipmentCategoryTabs || [];
          currentSelections = collection.equipmentSelections || {};
          break;
      }

      const removedTab = currentTabs.find(tab => tab.id === categoryTabId);
      
      if (!removedTab) {
        throw new Error(`Category tab not found. Tab ID: ${categoryTabId}`);
      }

      const updatedTabs = currentTabs.filter(tab => tab.id !== categoryTabId);

      const updatedSelections: Record<string, ItemSelection> = {};
      
      Object.entries(currentSelections).forEach(([itemId, selection]) => {
        if (selection.categoryTabId !== categoryTabId) {
          updatedSelections[itemId] = selection;
        }
      });

      const allRemainingTabs: CategoryTab[] = [
        ...(activeView === 'products' ? updatedTabs : collection.productCategoryTabs || []),
        ...(activeView === 'labor' ? updatedTabs : collection.laborCategoryTabs || []),
        ...(activeView === 'tools' ? updatedTabs : collection.toolCategoryTabs || []),
        ...(activeView === 'equipment' ? updatedTabs : collection.equipmentCategoryTabs || []),
      ];

      const cleanedCategorySelection = cleanCategorySelection(
        collection.categorySelection || {
          trade: '',
          sections: [],
          categories: [],
          subcategories: [],
          types: []
        },
        allRemainingTabs
      );

      const updateData: Partial<Collection> = {
        categorySelection: cleanedCategorySelection
      };
      
      if (activeView === 'products') {
        updateData.productCategoryTabs = updatedTabs;
        updateData.productSelections = updatedSelections;
      } else if (activeView === 'labor') {
        updateData.laborCategoryTabs = updatedTabs;
        updateData.laborSelections = updatedSelections;
      } else if (activeView === 'tools') {
        updateData.toolCategoryTabs = updatedTabs;
        updateData.toolSelections = updatedSelections;
      } else if (activeView === 'equipment') {
        updateData.equipmentCategoryTabs = updatedTabs;
        updateData.equipmentSelections = updatedSelections;
      }

      const updateResult = await updateCollectionCategories(collection.id, updateData);

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to remove category');
      }

      await loadCollection(collection.id);

      const currentTabIndex = currentTabs.findIndex(tab => tab.id === categoryTabId);
      if (currentTabIndex !== -1 && currentTabIndex + 1 === activeCategoryTabIndex) {
        setActiveCategoryTabIndex(0);
      } else if (currentTabIndex !== -1 && currentTabIndex + 1 < activeCategoryTabIndex) {
        setActiveCategoryTabIndex(activeCategoryTabIndex - 1);
      }

    } catch (error) {
      console.error('❌ Error removing category:', error);
      setUpdateError(
        error instanceof Error 
          ? error.message 
          : 'Failed to remove category. Please try again.'
      );
    } finally {
      setIsUpdatingCategories(false);
    }
  };

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
      
      {activeView !== 'summary' && (
        <CategoryTabBar
          collectionName={collection.name}
          contentType={activeView}
          categoryTabs={currentCategoryTabs}
          activeTabIndex={activeCategoryTabIndex}
          selections={currentSelections}
          onTabChange={setActiveCategoryTabIndex}
          onAddCategories={() => setShowCategoryEditor(true)}
          onRemoveCategory={handleRemoveCategory}
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