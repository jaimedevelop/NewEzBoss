import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, AlertCircle, FolderOpen, Trash2, ArrowLeft, Copy } from 'lucide-react';
import { Collection, getCollectionsPage, deleteCollection, duplicateCollection } from '../../../services/collections';
import { updateCollectionLastAccessed } from '../../../services/collections/collections.mutations';
import { Alert } from '../../../mainComponents/ui/Alert';

const CollectionsList: React.FC = () => {
  const pageSize = 24;
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const requestGeneration = useRef(0);

  // NOTE: previously used subscribeToCollections() for realtime Firestore
  // updates; the REST backend has no push channel, so this now just
  // refetches on mount plus after mutations (see loadCollections() calls
  // in handleDuplicateCollection/handleDeleteCollection below).
  const loadCollections = useCallback(async (requestedPage: number) => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError(null);

    try {
      const result = await getCollectionsPage({
        page: requestedPage,
        limit: pageSize,
        category: filterCategory === 'all' ? undefined : filterCategory,
        search: searchTerm,
      });
      if (generation !== requestGeneration.current) return;
      if (result.success && result.data) {
        // A delete can leave the final page empty; return to the preceding page.
        if (result.data.collections.length === 0 && result.data.total > 0 && requestedPage > 1) {
          setPage(requestedPage - 1);
          return;
        }
        setCollections(result.data.collections);
        setTotal(result.data.total);
        setHasMore(result.data.hasMore);
      } else {
        setError('Failed to load collections');
      }
    } catch (err) {
      if (generation !== requestGeneration.current) return;
      setError('An unexpected error occurred');
      console.error('Error loading collections:', err);
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [filterCategory, searchTerm]);

  useEffect(() => {
    void loadCollections(page);
    return () => { requestGeneration.current += 1; };
  }, [loadCollections, page]);

  const handleOpenCollection = async (collectionId: string) => {
    await updateCollectionLastAccessed(collectionId);
    navigate(`/collections/${collectionId}`, { state: { from: '/collections/list' } });
  };

  const handleDuplicateCollection = async (collectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setDuplicating(collectionId);
    setError(null);

    try {
      const result = await duplicateCollection(collectionId);
      if (result.success) {
        if (page === 1) await loadCollections(1);
        else setPage(1);
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
        await loadCollections(page);
      } else {
        setError('Failed to delete collection');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting collection');
      console.error('Error deleting collection:', err);
    }
  };

  // Categories are server-filtered before pagination. This menu includes values
  // encountered in the current page; a selected value remains available.
  const categories = Array.from(new Set(
    collections.map(c => c.categorySelection?.trade || c.category).filter(Boolean)
  ));
  if (filterCategory !== 'all' && !categories.includes(filterCategory)) categories.push(filterCategory);

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
                {total} collection{total !== 1 ? 's' : ''}
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
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
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
        ) : collections.length === 0 ? (
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
            {collections.map((collection) => (
              <div
                key={collection.id}
                onClick={() => handleOpenCollection(collection.id!)}
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
                      collection.categoryCount ??
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
                    {collection.itemCount ??
                      Object.values(collection.productSelections || {}).filter(p => p.isSelected).length}{' '}
                    products
                  </span>
                  <span>•</span>
                  <span>
                    {(collection.totalEstimatedHours ?? collection.estimatedHours ?? 0).toFixed(2)}h
                  </span>
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
        {!loading && total > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(current => current - 1)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => setPage(current => current + 1)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsList;
