import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import CollectionsScreen from './CollectionsScreen/CollectionsScreen';
import CategoryTabBar from './CategoryTabBar';
import { Collection, getCollection, deleteCollection } from '../../../services/collections';
import { Alert } from '../../../mainComponents/ui/Alert';

const CollectionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryTabIndex, setActiveCategoryTabIndex] = useState(0);

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
        categoryTabs={collection.categoryTabs || []}
        activeTabIndex={activeCategoryTabIndex}
        productSelections={collection.productSelections || {}}
        onTabChange={setActiveCategoryTabIndex}
      />
    </div>
  );
};

export default CollectionView;