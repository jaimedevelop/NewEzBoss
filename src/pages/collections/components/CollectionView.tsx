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
 * Handles both legacy flat structure and new hierarchical structure
 */
const mergeCategoryItems = (
  existing: string[] | HierarchicalCategoryItem[],
  newItems: string[] | HierarchicalCategoryItem[]
): string[] | HierarchicalCategoryItem[] => {
  console.log('🔀 mergeCategoryItems CALLED');
  console.log('  📥 Existing items:', existing.length, 'items');
  console.log('  📥 Existing:', JSON.stringify(existing, null, 2));
  console.log('  📥 New items:', newItems.length, 'items');
  console.log('  📥 New:', JSON.stringify(newItems, null, 2));

  // Check if we're dealing with strings or objects
  const isStringArray = (arr: any[]): arr is string[] => {
    return arr.length === 0 || typeof arr[0] === 'string';
  };

  // If both are strings, simple Set merge
  if (isStringArray(existing) && isStringArray(newItems)) {
    const merged = Array.from(new Set([...existing, ...newItems]));
    console.log('  ✅ STRING MERGE - Result:', merged.length, 'items');
    console.log('  📤 Result:', JSON.stringify(merged, null, 2));
    return merged;
  }

  // If dealing with hierarchical objects
  console.log('  🔍 HIERARCHICAL MERGE - Processing objects...');
  const existingObjects = existing as HierarchicalCategoryItem[];
  const newObjects = newItems as HierarchicalCategoryItem[];

  // Create a map using unique keys based on the full hierarchy
  const itemMap = new Map<string, HierarchicalCategoryItem>();

  // Add existing items
  console.log('  📌 Adding existing items to map:');
  existingObjects.forEach(item => {
    const key = `${item.name}|${item.tradeName || ''}|${item.sectionName || ''}|${item.categoryName || ''}`;
    console.log(`    - Key: "${key}"`);
    itemMap.set(key, item);
  });

  console.log('  📌 Map after existing:', itemMap.size, 'items');

  // Add new items (will NOT overwrite if same key - that's the point!)
  console.log('  ➕ Adding new items to map:');
  newObjects.forEach(item => {
    const key = `${item.name}|${item.tradeName || ''}|${item.sectionName || ''}|${item.categoryName || ''}`;
    if (itemMap.has(key)) {
      console.log(`    ⚠️  DUPLICATE FOUND - Keeping existing: "${key}"`);
    } else {
      console.log(`    ✅ NEW ITEM - Adding: "${key}"`);
      itemMap.set(key, item);
    }
  });

  const result = Array.from(itemMap.values());
  console.log('  ✅ MERGE COMPLETE!');
  console.log('  📤 Final count:', result.length, 'items');
  console.log('  📤 Final result:', JSON.stringify(result, null, 2));
  
  return result;
};

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

/**
 * Match item against hierarchical category selection
 * Logic: Item matches if it's in ANY of the selected sections/categories/subcategories/types
 */
const matchesHierarchicalSelection = (
  item: any,
  selection: CategorySelection
): boolean => {
  // Type guard to check if this is hierarchical structure
  const isHierarchical = 
    selection.sections.length > 0 && 
    typeof selection.sections[0] === 'object' &&
    'tradeName' in (selection.sections[0] as any);

  if (!isHierarchical) {
    // Legacy flat structure
    return matchesLegacySelection(item, selection);
  }

  // Cast to typed arrays for TypeScript
  const sections = selection.sections as Array<{
    name: string;
    tradeName: string;
  }>;
  
  const categories = selection.categories as Array<{
    name: string;
    tradeName: string;
    sectionName: string;
  }>;
  
  const subcategories = selection.subcategories as Array<{
    name: string;
    tradeName: string;
    sectionName: string;
    categoryName: string;
  }>;
  
  const types = (selection.types || []) as Array<{
    name: string;
    tradeName: string;
    sectionName: string;
    categoryName: string;
    subcategoryName: string;
  }>;

  // IMPORTANT: Match item fields (trade, section, category) 
  // against selection hierarchical fields (tradeName, sectionName, etc.)
  
  // Match sections
  if (sections.length > 0) {
    const sectionMatch = sections.some((s) =>
      s.name === item.section &&
      s.tradeName === item.trade
    );
    if (sectionMatch) return true;
  }

  // Match categories
  if (categories.length > 0) {
    const categoryMatch = categories.some((c) =>
      c.name === item.category &&
      c.sectionName === item.section &&
      c.tradeName === item.trade
    );
    if (categoryMatch) return true;
  }

  // Match subcategories
  if (subcategories.length > 0) {
    const subcategoryMatch = subcategories.some((sc) =>
      sc.name === item.subcategory &&
      sc.categoryName === item.category &&
      sc.sectionName === item.section &&
      sc.tradeName === item.trade
    );
    if (subcategoryMatch) return true;
  }

  // Match types
  if (types.length > 0) {
    const typeMatch = types.some((t) =>
      t.name === item.type &&
      t.subcategoryName === item.subcategory &&
      t.categoryName === item.category &&
      t.sectionName === item.section &&
      t.tradeName === item.trade
    );
    if (typeMatch) return true;
  }

  return false;
};

// Legacy matching function (for old flat structures)
const matchesLegacySelection = (
  item: any,
  selection: CategorySelection
): boolean => {
  if (selection.trade && item.trade !== selection.trade) {
    return false;
  }

  const sections = selection.sections as string[];
  const categories = selection.categories as string[];
  const subcategories = selection.subcategories as string[];
  const types = (selection.types || []) as string[];

  if (sections.length > 0 && !sections.includes(item.section)) {
    return false;
  }

  if (categories.length > 0 && !categories.includes(item.category)) {
    return false;
  }

  if (subcategories.length > 0 && !subcategories.includes(item.subcategory)) {
    return false;
  }

  if (types.length > 0 && !types.includes(item.type)) {
    return false;
  }

  return true;
};

  // Handle category selection completion
  const handleCategoryEditComplete = async (newSelection: CategorySelection) => {
    if (!collection?.id || !currentUser || activeView === 'summary') return;

    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 handleCategoryEditComplete CALLED');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 CURRENT collection.categorySelection:');
    console.log(JSON.stringify(collection.categorySelection, null, 2));
    console.log('');
    console.log('📋 NEW selection from selector:');
    console.log(JSON.stringify(newSelection, null, 2));
    console.log('═══════════════════════════════════════════════════════');

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
          
          newItems = allLabor.filter(labor => matchesHierarchicalSelection(labor, newSelection));
          
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
          
          newItems = allTools.filter(tool => matchesHierarchicalSelection(tool, newSelection));
          
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
          
          newItems = allEquipment.filter(equipment => matchesHierarchicalSelection(equipment, newSelection));
          
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
      // ✅ ADD THESE DEBUG LOGS RIGHT HERE:
console.log('');
console.log('🔍 TAB MERGE DEBUG');
console.log('══════════════════════════════════════════════════════');
console.log('📦 EXISTING TABS:');
console.log('  Count:', existingTabs.length);
console.log('  Tabs:', existingTabs.map(t => ({ id: t.id, name: t.name, section: t.section, category: t.category })));
console.log('');
console.log('📦 NEW TABS:');
console.log('  Count:', newTabs.length);
console.log('  Tabs:', newTabs.map(t => ({ id: t.id, name: t.name, section: t.section, category: t.category })));
console.log('══════════════════════════════════════════════════════');

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

      console.log('');
      console.log('🔄 STARTING MERGE PROCESS');
      console.log('══════════════════════════════════════════════════════');
      console.log('📊 BEFORE MERGE:');
      console.log('  Existing sections:', existingCategorySelection.sections.length);
      console.log('  Existing categories:', existingCategorySelection.categories.length);
      console.log('  Existing subcategories:', existingCategorySelection.subcategories.length);
      console.log('  New sections:', newSelection.sections.length);
      console.log('  New categories:', newSelection.categories.length);
      console.log('  New subcategories:', newSelection.subcategories.length);
      console.log('');

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

      console.log('');
      console.log('✅ MERGE COMPLETE!');
      console.log('══════════════════════════════════════════════════════');
      console.log('📊 AFTER MERGE:');
      console.log('  Merged sections:', mergedCategorySelection.sections.length);
      console.log('  Merged categories:', mergedCategorySelection.categories.length);
      console.log('  Merged subcategories:', mergedCategorySelection.subcategories.length);
      console.log('');
      console.log('📋 FULL MERGED categorySelection:');
      console.log(JSON.stringify(mergedCategorySelection, null, 2));
      console.log('══════════════════════════════════════════════════════');

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

      console.log('');
      console.log('💾 SAVING TO FIREBASE');
      console.log('══════════════════════════════════════════════════════');
      console.log('📤 Update data being sent to Firebase:');
      console.log(JSON.stringify(updateData, null, 2));
      console.log('══════════════════════════════════════════════════════');

      const updateResult = await updateCollectionCategories(collection.id, updateData);

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update collection');
      }

      console.log('✅ Firebase update successful!');
      console.log('🔄 Reloading collection from Firebase...');

      await loadCollection(collection.id);
      setActiveCategoryTabIndex(0);

      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ COMPLETE - Category update finished successfully');
      console.log('═══════════════════════════════════════════════════════');

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

  /**
 * Cleans up categorySelection by removing entries that no longer have associated tabs
 */
const cleanCategorySelection = (
  categorySelection: CategorySelection,
  remainingTabs: CategoryTab[]
): CategorySelection => {
  // Collect all unique names from remaining tabs
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
  
  console.log('🧹 Cleaning categorySelection. Used:', {
    sections: Array.from(usedSections),
    categories: Array.from(usedCategories),
    subcategories: Array.from(usedSubcategories)
  });
  
  // Filter categorySelection to only include used names
  return {
    trade: categorySelection.trade, // Keep trade (primary category)
    sections: (categorySelection.sections || []).filter(s => usedSections.has(s)),
    categories: (categorySelection.categories || []).filter(c => usedCategories.has(c)),
    subcategories: (categorySelection.subcategories || []).filter(sc => usedSubcategories.has(sc)),
    types: categorySelection.types || [], // Keep types for now (products only)
    description: categorySelection.description
  };
};

const handleRemoveCategory = async (categoryTabId: string) => {
  if (!collection?.id || activeView === 'summary') return;

  console.log('🗑️ Remove category called:', { categoryTabId, activeView });

  setIsUpdatingCategories(true);
  setUpdateError(null);

  try {
    // Get current tabs and selections
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

    console.log('📊 Current tabs:', currentTabs.map(t => ({ id: t.id, name: t.name, type: t.type })));

    // Find the tab being removed
    const removedTab = currentTabs.find(tab => tab.id === categoryTabId);
    
    if (!removedTab) {
      console.error('❌ Tab not found. Available IDs:', currentTabs.map(t => t.id));
      throw new Error(`Category tab not found. Tab ID: ${categoryTabId}`);
    }

    console.log('✅ Found tab to remove:', removedTab);

    // Filter out the removed tab
    const updatedTabs = currentTabs.filter(tab => tab.id !== categoryTabId);

    // Remove selections associated with this tab
    const updatedSelections: Record<string, ItemSelection> = {};
    let removedCount = 0;
    
    Object.entries(currentSelections).forEach(([itemId, selection]) => {
      if (selection.categoryTabId !== categoryTabId) {
        updatedSelections[itemId] = selection;
      } else {
        removedCount++;
      }
    });

    console.log('🗑️ Removed selections:', removedCount);

    // ✅ NEW: Collect ALL remaining tabs from ALL content types
    const allRemainingTabs: CategoryTab[] = [
      ...(activeView === 'products' ? updatedTabs : collection.productCategoryTabs || []),
      ...(activeView === 'labor' ? updatedTabs : collection.laborCategoryTabs || []),
      ...(activeView === 'tools' ? updatedTabs : collection.toolCategoryTabs || []),
      ...(activeView === 'equipment' ? updatedTabs : collection.equipmentCategoryTabs || []),
    ];

    // ✅ NEW: Clean categorySelection based on ALL remaining tabs
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

    console.log('🧹 Cleaned categorySelection:', cleanedCategorySelection);

    // Prepare update data
    const updateData: Partial<Collection> = {
      categorySelection: cleanedCategorySelection // ✅ NEW: Include cleaned selection
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

    console.log('📤 Sending update to Firebase');

    // Update Firebase
    const updateResult = await updateCollectionCategories(collection.id, updateData);

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to remove category');
    }

    // Reload collection
    await loadCollection(collection.id);

    // Adjust active tab index if needed
    const currentTabIndex = currentTabs.findIndex(tab => tab.id === categoryTabId);
    if (currentTabIndex !== -1 && currentTabIndex + 1 === activeCategoryTabIndex) {
      console.log('🔄 Switching to Master tab (removed active tab)');
      setActiveCategoryTabIndex(0);
    } else if (currentTabIndex !== -1 && currentTabIndex + 1 < activeCategoryTabIndex) {
      console.log('🔄 Adjusting tab index');
      setActiveCategoryTabIndex(activeCategoryTabIndex - 1);
    }

    console.log('✅ Category removed successfully');

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
          onRemoveCategory={handleRemoveCategory}
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