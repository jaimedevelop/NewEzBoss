// src/pages/collections/components/CollectionView.tsx
import React, { useState, useEffect } from 'react';
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
} from '../../../services/collections';
import {
  getProductsByCategories,
  type InventoryProduct
} from '../../../services/inventory/products';
import { useAuthContext } from '../../../contexts/AuthContext';

const CollectionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  
  // Collection state
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryTabIndex, setActiveCategoryTabIndex] = useState(0);
  const [contentType, setContentType] = useState<CollectionContentType>('products');

  // Category editing state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCollection(id);
    }
  }, [id]);

  const loadCollection = async (collectionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCollection(collectionId);
      if (result.success && result.data) {
        setCollection(result.data);
        // Set initial content type (default to products if not specified)
        setContentType(result.data.contentType || 'products');
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
      // Group by section + category combination
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

      // Convert to CategoryTab array
      return Object.entries(grouped).map(([key, data]) => ({
        id: key,
        type: 'products' as CollectionContentType,  // ✅ Add type
        name: data.category,  // ✅ Just category name
        section: data.section,
        category: data.category,
        subcategories: [...new Set(data.products.map(p => p.subcategory))],
        itemIds: data.products.map(p => p.id).filter(Boolean) as string[]  // ✅ itemIds
      }));
    };

    const handleCategoryEditComplete = async (newSelection: CategorySelection) => {
      if (!collection?.id || !currentUser) return;

      console.log('🔄 Updating collection categories:', newSelection);
      setIsUpdatingCategories(true);
      setShowCategoryEditor(false);
      setUpdateError(null);

      try {
        // STEP 1: Fetch products matching the NEW selection
        console.log('📥 Step 1: Fetching products for new categories...');
        const newProductsResult = await getProductsByCategories(
          newSelection,
          currentUser.uid
        );

        if (!newProductsResult.success || !newProductsResult.data) {
          throw new Error('Failed to fetch products for new categories');
        }

        const newProducts = newProductsResult.data;
        console.log(`📦 Step 1 Complete: Fetched ${newProducts.length} products`);

        // STEP 2: Group NEW products into tabs
        console.log('📑 Step 2: Grouping new products into tabs...');
        const newProductTabs = groupProductsIntoTabs(newProducts);
        console.log(`📑 Step 2 Complete: Created ${newProductTabs.length} new tabs`);

        // STEP 3: MERGE with existing tabs (don't replace!)
        console.log('🔀 Step 3: Merging with existing tabs...');
        const existingTabs = collection.productCategoryTabs || [];
        
        // Create a map of existing tabs by section-category key
        const existingTabsMap = new Map(
          existingTabs.map(tab => [`${tab.section}-${tab.category}`, tab])
        );
        
        // Add new tabs, but don't overwrite existing ones
        const mergedTabs = [...existingTabs];
        newProductTabs.forEach(newTab => {
          const key = `${newTab.section}-${newTab.category}`;
          if (!existingTabsMap.has(key)) {
            console.log(`➕ Adding new tab: ${newTab.name} (${newTab.section})`);
            mergedTabs.push(newTab);
          } else {
            console.log(`⏭️ Tab already exists: ${newTab.name} (${newTab.section})`);
          }
        });
        
        console.log(`🔀 Step 3 Complete: Merged tabs (${existingTabs.length} existing + ${newProductTabs.length} new = ${mergedTabs.length} total)`);

        // STEP 4: MERGE product selections (preserve existing + add new as unselected)
        console.log('💾 Step 4: Merging product selections...');
        const existingSelections = collection.productSelections || {};
        const mergedSelections = { ...existingSelections };  // ✅ Start with existing
        
        // Add NEW products as unselected (if not already present)
        newProducts.forEach(product => {
          if (product.id && !mergedSelections[product.id]) {
            const productTab = mergedTabs.find(tab =>
              tab.section === product.section &&
              tab.category === product.category
            );
            
            if (productTab) {
              mergedSelections[product.id] = {
                isSelected: false,  // ✅ New products start unselected
                quantity: 1,
                categoryTabId: productTab.id,
                addedAt: Date.now(),
                itemName: product.name,
                itemSku: product.sku,
                unitPrice: product.unitPrice
              };
            }
          }
        });

        console.log(`💾 Step 4 Complete: Merged selections (${Object.keys(existingSelections).length} existing + ${newProducts.length} new products checked)`);

        // STEP 5: Update categorySelection to include new items
        console.log('📝 Step 5: Merging category selections...');
        const mergedCategorySelection: CategorySelection = {
          trade: collection.categorySelection?.trade || newSelection.trade,
          sections: [
            ...new Set([
              ...(collection.categorySelection?.sections || []),
              ...newSelection.sections
            ])
          ],
          categories: [
            ...new Set([
              ...(collection.categorySelection?.categories || []),
              ...newSelection.categories
            ])
          ],
          subcategories: [
            ...new Set([
              ...(collection.categorySelection?.subcategories || []),
              ...newSelection.subcategories
            ])
          ],
          types: [
            ...new Set([
              ...(collection.categorySelection?.types || []),
              ...newSelection.types
            ])
          ],
          description: newSelection.description || collection.categorySelection?.description
        };
        console.log('📝 Step 5 Complete: Category selection merged');

        // STEP 6: Update collection in Firebase
        console.log('🔥 Step 6: Saving to Firebase...');
        const updateResult = await updateCollectionCategories(collection.id, {
          categorySelection: mergedCategorySelection,
          productCategoryTabs: mergedTabs,  // ✅ Correct field name
          productSelections: mergedSelections
        });

        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update collection');
        }

        console.log('✅ Step 6 Complete: Saved to Firebase successfully');

        // STEP 7: Reload the collection
        console.log('🔄 Step 7: Reloading collection...');
        await loadCollection(collection.id);
        console.log('✅ Step 7 Complete: Collection reloaded');

        // Reset to master tab
        setActiveCategoryTabIndex(0);

        console.log('🎉 Category update completed successfully!');

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
      />
      
    <CategoryTabBar
      collectionName={collection.name}
      contentType={contentType}
      categoryTabs={collection.productCategoryTabs || []}  // ✅ Correct field
      activeTabIndex={activeCategoryTabIndex}
      selections={collection.productSelections || {}}
      onTabChange={setActiveCategoryTabIndex}
      onAddCategories={() => setShowCategoryEditor(true)}
    />

      {/* Category Editor Modal */}
      {showCategoryEditor && (
        <CollectionCategorySelector
          collectionName={collection.name}
          initialSelection={getCurrentCategorySelection()}
          onComplete={handleCategoryEditComplete}
          onClose={() => setShowCategoryEditor(false)}
        />
      )}

      {/* Loading Overlay during category update */}
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