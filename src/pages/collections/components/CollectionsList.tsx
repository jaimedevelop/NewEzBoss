import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, AlertCircle, FolderOpen, Trash2, ArrowLeft, Copy } from 'lucide-react';
import { Collection, getCollections, deleteCollection, duplicateCollection, subscribeToCollections } from '../../../services/collections';
import { Alert } from '../../../mainComponents/ui/Alert';

const CollectionsList: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [duplicating, setDuplicating] = useState<string | null>(null);

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

  const loadCollections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCollections();
      if (result.success && result.data) {
        setCollections(result.data);
      } else {
        setError('Failed to load collections');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateCollection = async (collectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setDuplicating(collectionId);
    setError(null);

    try {
      const result = await duplicateCollection(collectionId);
      if (result.success) {
        await loadCollections();
      } else {
        setError('Failed to duplicate collection');
      }
    } catch (err) {
      setError('An unexpected error occurred while duplicating collection');
      console.error('Error duplicating collection:', err);
    } finally {
      setDuplicating(null);
    }
  };

  const handleDeleteCollection = async (collectionId: string, collectionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete "${collectionName}"?`)) {
      return;
    }

    try {
      const result = await deleteCollection(collectionId);
      if (result.success) {
        setCollections(prev => prev.filter(c => c.id !== collectionId));
      } else {
        setError('Failed to delete collection');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting collection');
      console.error('Error deleting collection:', err);
    }
  };

  // Filter collections
  const filteredCollections = collections.filter(collection => {
    const matchesSearch = 
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.description && collection.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      collection.categorySelection?.trade?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      filterCategory === 'all' || 
      collection.categorySelection?.trade === filterCategory ||
      collection.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(
    collections.map(c => c.categorySelection?.trade || c.category).filter(Boolean)
  ));

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 p-6">
      {/* Error Alert */}
      {error && (
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
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/collections')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Collections"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
              <p className="text-gray-600 mt-1">
                {filteredCollections.length} collection{filteredCollections.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/collections/new')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Collection
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
            <p className="text-gray-500">Loading collections...</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterCategory !== 'all' 
                ? 'No collections found' 
                : 'No collections yet'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterCategory !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Get started by creating your first collection'
              }
            </p>
            {!searchTerm && filterCategory === 'all' && (
              <button
                onClick={() => navigate('/collections/new')}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((collection) => (
              <div
                key={collection.id}
                onClick={() => navigate(`/collections/${collection.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {collection.categorySelection?.trade || collection.category}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => handleDuplicateCollection(collection.id!, e)}
                      disabled={duplicating === collection.id}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Duplicate collection"
                    >
                      {duplicating === collection.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteCollection(collection.id!, collection.name, e)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {collection.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {collection.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {(() => {
                    const totalTabs = 
                      (collection.productCategoryTabs?.length || 0) +
                      (collection.laborCategoryTabs?.length || 0) +
                      (collection.toolCategoryTabs?.length || 0) +
                      (collection.equipmentCategoryTabs?.length || 0);
                    return (
                      <span>
                        {totalTabs} categor{totalTabs === 1 ? 'y' : 'ies'}
                      </span>
                    );
                  })()}
                  <span>•</span>
                  <span>
                    {Object.values(collection.productSelections || {}).filter(p => p.isSelected).length} products
                  </span>
                  <span>•</span>
                  <span>{collection.estimatedHours}h</span>
                </div>

                {(() => {
                  const allTabs = [
                    ...(collection.productCategoryTabs || []),
                    ...(collection.laborCategoryTabs || []),
                    ...(collection.toolCategoryTabs || []),
                    ...(collection.equipmentCategoryTabs || [])
                  ];
                  
                  return allTabs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {allTabs.slice(0, 3).map((tab, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {tab.name}
                        </span>
                      ))}
                      {allTabs.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{allTabs.length - 3} more
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsList;