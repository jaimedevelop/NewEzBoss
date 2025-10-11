import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollectionCategorySelector, { CategorySelection } from './CollectionCategorySelector';
import { createCollection, CategoryTab } from '../../../services/collections';
import { getProductsByCategories } from '../../../services/products';
import { useAuthContext } from '../../../contexts/AuthContext';

const CollectionNew: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorySelectionComplete = async (categorySelection: CategorySelection) => {
    console.log('🎯 handleCategorySelectionComplete called');
    
    setIsCreating(true);
    
    try {
      const collectionName = categorySelection.collectionName || 
                            categorySelection.description || 
                            `${categorySelection.trade || 'Mixed'} Collection`;
      
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
      
      if (!currentUser?.uid) {
        setError('User not authenticated');
        setIsCreating(false);
        return;
      }

      const productsResult = await getProductsByCategories(categorySelection, currentUser.uid);
      const products = productsResult.data;
      console.log(`✅ Fetched ${products.length} products`);
      
      // Use composite key (section|category) to prevent collisions
      const categoryMap = new Map<string, {
        section: string;
        category: string;
        subcategories: Set<string>;
        productIds: string[];
      }>();
      
      products.forEach(product => {
        const section = product.section;
        const category = product.category;
        const subcategory = product.subcategory;
        
        const compositeKey = `${section}|${category}`;
        
        if (!categoryMap.has(compositeKey)) {
          categoryMap.set(compositeKey, {
            section: section,
            category: category,
            subcategories: new Set(),
            productIds: [],
          });
        }
        
        const categoryData = categoryMap.get(compositeKey)!;
        categoryData.subcategories.add(subcategory);
        categoryData.productIds.push(product.id!);
      });
      
      const categoryTabs: CategoryTab[] = Array.from(categoryMap.entries()).map(
        ([compositeKey, data]) => ({
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: data.category,
          section: data.section,
          category: data.category,
          subcategories: Array.from(data.subcategories),
          productIds: data.productIds,
        })
      );
      
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
      
      const result = await createCollection(collectionData);
      
      if (result.success && result.id) {
        console.log('✅ Collection created successfully with ID:', result.id);
        // Navigate to the newly created collection
        navigate(`/collections/${result.id}`);
      } else {
        setError(result.error?.message || 'Failed to create collection');
      }
    } catch (err) {
      console.error('💥 Error creating collection:', err);
      setError('An unexpected error occurred while creating collection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    navigate('/collections');
  };

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
      
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-600 underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <CollectionCategorySelector
        collectionName="New Collection"
        onComplete={handleCategorySelectionComplete}
        onClose={handleClose}
      />
    </div>
  );
};

export default CollectionNew;