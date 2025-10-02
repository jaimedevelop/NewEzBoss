import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { 
  getProductsForCollectionTabs, 
  batchUpdateProductSelections,
  updateCollectionMetadata,
} from '../../../../services/collections';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useAutoSave } from '../../../../hooks/useAutoSave';
import SavingIndicator from '../../../../mainComponents/ui/SavingIndicator';
import { 
  getCachedProducts, 
  setCachedProducts, 
  getCacheStats,
  invalidateCache 
} from '../../../../utils/productCache';
import type { Collection, ProductSelection } from '../../../../services/collections';
import type { InventoryProduct } from '../../../../services/products';
import CollectionHeader from './components/CollectionHeader';
import MasterTabView from './components/MasterTabView';
import CategoryTabView from './components/CategoryTabView';
import TaxConfigModal from './components/TaxConfigModal';
import { Alert } from '../../../../mainComponents/ui/Alert';

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
  // Auth
  const { currentUser } = useAuthContext();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [collectionName, setCollectionName] = useState(collection?.name || 'New Collection');
  const [collectionDescription, setCollectionDescription] = useState(
    collection?.categorySelection?.description || ''
  );
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxRate, setTaxRate] = useState(collection?.taxRate ?? 0.07);

  // Data State
  const [allProducts, setAllProducts] = useState<InventoryProduct[]>([]);
  const [productSelections, setProductSelections] = useState<Record<string, ProductSelection>>(
    collection?.productSelections || {}
  );
  const [lastSavedSelections, setLastSavedSelections] = useState<Record<string, ProductSelection>>(
    collection?.productSelections || {}
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auto-save hook with 1 second debounce + DELTA SAVES
  const { saveStatus, saveError, forceSave, clearError } = useAutoSave({
    data: productSelections,
    onSave: async (selections) => {
      if (!collection.id) return;
      
      // Calculate diff - only save changed items
      const changedSelections: Record<string, ProductSelection> = {};
      
      // Find new or changed items
      Object.keys(selections).forEach(productId => {
        const current = selections[productId];
        const previous = lastSavedSelections[productId];
        
        // Include if new, changed quantity, or changed selection
        if (!previous || 
            current.quantity !== previous.quantity || 
            current.isSelected !== previous.isSelected) {
          changedSelections[productId] = current;
        }
      });
      
      // Find removed items
      Object.keys(lastSavedSelections).forEach(productId => {
        if (!selections[productId]) {
          // Mark as removed
          changedSelections[productId] = {
            ...lastSavedSelections[productId],
            isSelected: false,
            quantity: 0,
          };
        }
      });
      
      const changeCount = Object.keys(changedSelections).length;
      
      if (changeCount === 0) {
        console.log('💾 No changes to save');
        return;
      }
      
      console.log(`💾 Saving ${changeCount} changed item(s) (was ${Object.keys(selections).length} total)`);
      
      const result = await batchUpdateProductSelections(collection.id, changedSelections);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save selections');
      }
      
      // Update last saved state after successful save
      setLastSavedSelections(selections);
      console.log('✅ Save successful');
    },
    debounceMs: 1000,
    localStorageKey: `collection-selections-${collection.id}`,
    enabled: true,
    onSaveStart: () => {
      console.log('🔄 Auto-save started');
    },
    onSaveSuccess: () => {
      console.log('✅ Auto-save completed');
    },
    onSaveError: (error) => {
      console.error('❌ Auto-save failed:', error);
    },
  });

  // Load all products - CACHE FIRST STRATEGY
  useEffect(() => {
    loadAllProducts();
  }, [collection.id]); // ✅ FIXED: Only reload on new collection, not on every save

  // Update local state when collection changes
  useEffect(() => {
    setTaxRate(collection?.taxRate ?? 0.07);
    setCollectionName(collection?.name || 'New Collection');
    setCollectionDescription(collection?.categorySelection?.description || '');
    setProductSelections(collection?.productSelections || {});
    setLastSavedSelections(collection?.productSelections || {});
  }, [collection.id]); // Only update on collection ID change

  const loadAllProducts = async () => {
    if (!collection?.categoryTabs || collection.categoryTabs.length === 0) {
      console.warn('No category tabs found in collection');
      setIsLoadingProducts(false);
      return;
    }

    setIsLoadingProducts(true);
    setLoadError(null);

    const startTime = performance.now();

    try {
      // Get all unique product IDs from all tabs
      const allProductIds = Array.from(
        new Set(
          collection.categoryTabs.flatMap(tab => tab.productIds)
        )
      );

      console.log(`📦 Loading ${allProductIds.length} products for collection tabs`);

      // Check cache stats
      const cacheStats = getCacheStats();
      if (cacheStats) {
        console.log(`📊 Cache stats:`, {
          valid: cacheStats.valid,
          productCount: cacheStats.productCount,
          ageHours: cacheStats.ageHours.toFixed(2),
          expiresInHours: cacheStats.expiresInHours.toFixed(2),
        });
      }

      // Try to get products from cache first
      const { cachedProducts, missingIds } = getCachedProducts(allProductIds);

      let fetchedProducts: InventoryProduct[] = [];

      // Only fetch missing products from Firebase
      if (missingIds.length > 0) {
        console.log(`🔥 Fetching ${missingIds.length} products from Firebase`);
        const result = await getProductsForCollectionTabs(missingIds);

        if (result.success && result.data) {
          fetchedProducts = result.data;
          
          // Add newly fetched products to cache
          setCachedProducts(fetchedProducts);
        } else {
          console.error('Failed to load products:', result.error);
          setLoadError(result.error?.message || 'Failed to load products');
          
          // Still use cached products if we have them
          if (cachedProducts.length > 0) {
            setAllProducts(cachedProducts);
          } else {
            setAllProducts([]);
          }
          setIsLoadingProducts(false);
          return;
        }
      } else {
        console.log('✅ All products loaded from cache (0 Firebase reads)');
      }

      // Combine cached and fetched products
      const allLoadedProducts = [...cachedProducts, ...fetchedProducts];
      setAllProducts(allLoadedProducts);

      const endTime = performance.now();
      const loadTime = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`✅ Loaded ${allLoadedProducts.length} products in ${loadTime}s`);
      console.log(`   - ${cachedProducts.length} from cache`);
      console.log(`   - ${fetchedProducts.length} from Firebase`);
      console.log(`   - ${missingIds.length} Firebase reads`);

    } catch (error) {
      console.error('Error loading products:', error);
      setLoadError(`Error loading products: ${error.message || error}`);
      setAllProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Manual cache refresh
  const handleRefreshCache = async () => {
    console.log('🔄 Manual cache refresh requested');
    invalidateCache();
    await loadAllProducts();
  };

  // Product selection handlers - OPTIMIZED
  const handleToggleSelection = useCallback((productId: string) => {
    setProductSelections(prev => {
      const current = prev[productId];
      const currentTab = collection.categoryTabs?.[Math.max(0, activeCategoryTabIndex - 1)];
      
      if (!currentTab && activeCategoryTabIndex !== 0) {
        console.error('No tab found for index:', activeCategoryTabIndex);
        return prev;
      }

      // If currently selected, remove it
      if (current?.isSelected) {
        const { [productId]: removed, ...rest } = prev;
        console.log('🗑️ Deselected product:', productId);
        return rest;
      } 
      
      // Otherwise, add it with quantity 1
      const product = allProducts.find(p => p.id === productId);
      console.log('✅ Selected product:', productId);
      
      return {
        ...prev,
        [productId]: {
          isSelected: true,
          quantity: 1,
          categoryTabId: currentTab?.id || '',
          addedAt: Date.now(),
          productName: product?.name,
          productSku: product?.skus?.[0]?.sku || product?.sku,
          unitPrice: product?.priceEntries?.[0]?.price || 0,
        },
      };
    });
  }, [activeCategoryTabIndex, collection.categoryTabs, allProducts]);

  // Quantity change handler - TRIGGERS ON BLUR/ENTER
  const handleQuantityChange = useCallback((productId: string, quantity: number) => {
    console.log('📝 Quantity changed for product:', productId, 'New quantity:', quantity);
    
    setProductSelections(prev => {
      const current = prev[productId];
      if (!current) {
        console.warn('Product not found in selections:', productId);
        return prev;
      }

      // If quantity is 0 or less, remove the selection
      if (quantity <= 0) {
        const { [productId]: removed, ...rest } = prev;
        console.log('🗑️ Removed product due to zero quantity:', productId);
        return rest;
      }

      // Update quantity
      return {
        ...prev,
        [productId]: {
          ...current,
          quantity,
        },
      };
    });
  }, []);

  // Get products for current tab
  const getCurrentTabProducts = (): InventoryProduct[] => {
    if (activeCategoryTabIndex === 0) {
      return allProducts.filter(p => productSelections[p.id!]?.isSelected);
    } else {
      const currentTab = collection.categoryTabs?.[activeCategoryTabIndex - 1];
      if (!currentTab) return [];
      
      return allProducts.filter(p => currentTab.productIds.includes(p.id!));
    }
  };

  const currentTabProducts = getCurrentTabProducts();
  const currentTab = activeCategoryTabIndex > 0 ? collection.categoryTabs?.[activeCategoryTabIndex - 1] : null;

  // Edit handlers
  const handleEdit = () => setIsEditing(true);
  
  const handleCancel = () => {
    setIsEditing(false);
    setCollectionName(collection?.name || 'New Collection');
    setCollectionDescription(collection?.categorySelection?.description || '');
  };
  
  const handleSave = async () => {
    // Force save any pending changes
    await forceSave();
    
    // Update metadata if changed
    if (collectionName !== collection.name || 
        collectionDescription !== collection.categorySelection?.description) {
      if (collection.id) {
        await updateCollectionMetadata(collection.id, {
          name: collectionName,
          description: collectionDescription,
        });
      }
    }
    
    setIsEditing(false);
  };

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No collection selected</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const categorySelection = collection?.categorySelection || {};

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Save Status Indicator */}
      <SavingIndicator 
        status={saveStatus}
        error={saveError}
        onDismissError={clearError}
      />

      {/* Error Alert */}
      {saveError && (
        <div className="fixed top-16 right-4 z-40 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-medium">Save Error</p>
              <p className="text-sm">{saveError}</p>
              <button
                onClick={clearError}
                className="text-xs underline mt-1"
              >
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
        trade={categorySelection.trade}
        isEditing={isEditing}
        onBack={onBack}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={onDelete}
        onNameChange={setCollectionName}
        onOptionsClick={() => setShowTaxModal(true)}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeCategoryTabIndex === 0 ? (
          // Master Tab View
          <MasterTabView
            collectionName={collectionName}
            categoryTabs={collection.categoryTabs || []}
            allProducts={allProducts}
            productSelections={productSelections}
            taxRate={taxRate}
            onQuantityChange={handleQuantityChange}
          />
        ) : (
          // Category Tab View
          currentTab && (
            <CategoryTabView
              categoryName={currentTab.name}
              subcategories={currentTab.subcategories}
              products={currentTabProducts}
              productSelections={productSelections}
              isLoading={isLoadingProducts}
              loadError={loadError}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleSelection={handleToggleSelection}
              onQuantityChange={handleQuantityChange}
              onRetry={loadAllProducts}
            />
          )
        )}
      </div>
    </div>
  );
};

export default CollectionsScreen;