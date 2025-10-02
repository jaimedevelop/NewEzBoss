// src/pages/collections/Collections.tsx
import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, AlertCircle } from 'lucide-react';
import CollectionsScreen from './components/CollectionsScreen/CollectionsScreen';
import CollectionCategorySelector, { CategorySelection } from './components/CollectionCategorySelector';
import CategoryTabBar from './components/CategoryTabBar';
import { Alert } from '../../mainComponents/ui/Alert';
import { 
  Collection, 
  getCollections, 
  subscribeToCollections,
  createCollectionWithCategories,
  deleteCollection 
} from '../../services/collections';
import { getProductsByCategories } from '../../services/products';
import { createCollection } from '../../services/collections';
import type { CategoryTab } from '../../services/collections';
import { useAuthContext } from '../../contexts/AuthContext';

type ViewType = 'landing' | 'collections' | 'categorySelector';

const Collections: React.FC = () => {
  const [view, setView] = useState<ViewType>('landing');
  const [activeTab, setActiveTab] = useState(0);
  const [activeCategoryTabIndex, setActiveCategoryTabIndex] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { currentUser } = useAuthContext();
  
  useEffect(() => {
    loadCollections();
    
    const unsubscribe = subscribeToCollections((updatedCollections) => {
      setCollections(updatedCollections);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    setActiveCategoryTabIndex(0);
  }, [activeTab]);

  const loadCollections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCollections();
      if (result.success && result.data) {
        setCollections(result.data);
      } else {
        setError(result.error?.message || 'Failed to load collections');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollection = () => {
    setView('categorySelector');
  };

  const handleCategorySelectionComplete = async (categorySelection: CategorySelection) => {
    console.log('🎯 handleCategorySelectionComplete called');
    console.log('📝 Received categorySelection:', categorySelection);
    
    setIsCreating(true);
    
    try {
      const collectionName = categorySelection.collectionName || 
                            categorySelection.description || 
                            `${categorySelection.trade || 'Mixed'} Collection`;
      console.log('📋 Collection name:', collectionName);
      
      let trade = categorySelection.trade;
      if (!trade) {
        if (categorySelection.sections.length > 0) {
          trade = 'Mixed Categories';
        } else if (categorySelection.categories.length > 0) {
          trade = 'Mixed Categories';
        } else {
          trade = 'General';
        }
        categorySelection.trade = trade;
      }
      
      console.log('🔄 Fetching products for selected categories...');
      
      if (!currentUser?.uid) {
        console.error('❌ No authenticated user');
        setError('User not authenticated');
        setIsCreating(false);
        return;
      }

      const productsResult = await getProductsByCategories(categorySelection, currentUser.uid);
      const products = productsResult.data;
      console.log(`✅ Fetched ${products.length} products`);
      
      const categoryMap = new Map<string, {
        subcategories: Set<string>;
        productIds: string[];
      }>();
      
      products.forEach(product => {
        const category = product.category;
        const subcategory = product.subcategory;
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            subcategories: new Set(),
            productIds: [],
          });
        }
        
        const categoryData = categoryMap.get(category)!;
        categoryData.subcategories.add(subcategory);
        categoryData.productIds.push(product.id!);
      });
      
      console.log(`📊 Found ${categoryMap.size} unique categories`);
      
      const categoryTabs: CategoryTab[] = Array.from(categoryMap.entries()).map(
        ([category, data]) => ({
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: category,
          category: category,
          subcategories: Array.from(data.subcategories),
          productIds: data.productIds,
        })
      );
      
      console.log('📑 Created category tabs:', categoryTabs.map(t => 
        `${t.name} (${t.subcategories.length} subcategories, ${t.productIds.length} products)`
      ));
      
      const collectionData = {
        name: collectionName,
        category: trade,
        description: categorySelection.description || `Collection for ${trade} products`,
        estimatedHours: 2.0,
        categorySelection,
        assignedProducts: [],
        categoryTabs,
        productSelections: {},
        taxRate: 0.07,
      };
      
      console.log('🔄 Creating collection with data:', collectionData);
      
      const result = await createCollection(collectionData);
      
      console.log('📦 createCollection result:', result);
      
      if (result.success && result.id) {
        console.log('✅ Collection created successfully with ID:', result.id);
        
        console.log('🔄 Reloading collections...');
        await loadCollections();
        
        const newCollectionIndex = collections.findIndex(c => c.id === result.id);
        console.log('🔍 Finding new collection index:', newCollectionIndex);
        
        if (newCollectionIndex !== -1) {
          console.log('📍 Setting active tab to:', newCollectionIndex);
          setActiveTab(newCollectionIndex);
        } else {
          console.log('📍 Collection not found in state, setting to last tab:', collections.length);
          setActiveTab(collections.length);
        }
        
        setActiveCategoryTabIndex(0);
        
        console.log('🎬 Switching view to collections');
        setView('collections');
        setError(null);
      } else {
        console.error('❌ Failed to create collection:', result.error);
        setError(result.error?.message || 'Failed to create collection');
      }
    } catch (err) {
      console.error('💥 Unexpected error in handleCategorySelectionComplete:', err);
      setError('An unexpected error occurred while creating collection');
    } finally {
      console.log('🏁 Setting isCreating to false');
      setIsCreating(false);
    }
  };

  const handleCategorySelectorClose = () => {
    setView('landing');
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) {
      return;
    }

    try {
      const result = await deleteCollection(collectionId);
      if (result.success) {
        if (activeTab >= collections.length - 1) {
          setActiveTab(Math.max(0, collections.length - 2));
        }
        
        setActiveCategoryTabIndex(0);
        
        if (collections.length <= 1) {
          setView('landing');
        }
      } else {
        setError(result.error?.message || 'Failed to delete collection');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting collection');
      console.error('Error deleting collection:', err);
    }
  };

  if (view === 'categorySelector') {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50">
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-700">Creating your collection...</p>
              </div>
            </div>
          </div>
        )}
        <CollectionCategorySelector
          collectionName="New Collection"
          onComplete={handleCategorySelectionComplete}
          onClose={handleCategorySelectorClose}
        />
      </div>
    );
  }

  const errorAlert = error && (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <div>
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      </Alert>
    </div>
  );

  if (view === 'landing') {
    return (
      <>
        {errorAlert}
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
                <FolderOpen className="w-10 h-10 text-orange-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Job Collections
              </h1>
              <p className="text-xl text-gray-600">
                Create and manage standardized workflows for common jobs
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button
                onClick={handleAddCollection}
                disabled={loading}
                className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-orange-500 transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mb-4 group-hover:bg-orange-200 transition-colors">
                    <Plus className="w-7 h-7 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Create Collection
                  </h3>
                  <p className="text-sm text-gray-600">
                    Set up product categories and filters
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              <button
                onClick={() => setView('collections')}
                disabled={loading || collections.length === 0}
                className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                    <FolderOpen className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Go to Collections
                  </h3>
                  <p className="text-sm text-gray-600">
                    {collections.length === 0 
                      ? 'No collections yet' 
                      : 'View and manage existing templates'
                    }
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>

            {loading && (
              <div className="mt-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading collections...</p>
              </div>
            )}

            {!loading && collections.length > 0 && (
              <div className="mt-12">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Collections ({collections.length})
                </h2>
                <div className="grid gap-3">
                  {collections.slice(0, 3).map((collection, index) => (
                    <div
                      key={collection.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setActiveTab(index);
                        setActiveCategoryTabIndex(0);
                        setView('collections');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          <span className="font-medium text-gray-900">
                            {collection.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-500 block">
                            {collection.categorySelection?.trade || collection.category}
                          </span>
                          <span className="text-xs text-gray-400">
                            {collection.estimatedHours}h • {collection.categoryTabs?.length || 0} categories
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {collections.length > 3 && (
                    <button
                      onClick={() => setView('collections')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium py-2"
                    >
                      View all {collections.length} collections →
                    </button>
                  )}
                </div>
              </div>
            )}

            {!loading && collections.length === 0 && (
              <div className="mt-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <FolderOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No collections yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first workflow collection
                </p>
                <button
                  onClick={handleAddCollection}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Collection
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Collections view - SIMPLIFIED LAYOUT
  return (
    <>
      {errorAlert}
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {collections[activeTab] ? (
          <>
            <CollectionsScreen 
              collection={collections[activeTab]} 
              onBack={() => setView('landing')}
              onDelete={() => handleDeleteCollection(collections[activeTab].id!)}
              activeCategoryTabIndex={activeCategoryTabIndex}
              onCategoryTabChange={setActiveCategoryTabIndex}
            />
            
            <CategoryTabBar
              collectionName={collections[activeTab].name}
              categoryTabs={collections[activeTab].categoryTabs || []}
              activeTabIndex={activeCategoryTabIndex}
              productSelections={collections[activeTab].productSelections || {}}
              onTabChange={setActiveCategoryTabIndex}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No collection selected</p>
              <button
                onClick={() => setView('landing')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Collections;