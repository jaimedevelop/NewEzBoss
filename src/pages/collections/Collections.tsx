import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { Collection, getCollections } from '../../services/collections';

const Collections: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    
    try {
      const result = await getCollections();
      if (result.success && result.data) {
        setCollections(result.data);
      }
    } catch (err) {
      console.error('Error loading collections:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
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
            onClick={() => navigate('/collections/new')}
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
            onClick={() => navigate('/collections/list')}
            disabled={loading || collections.length === 0}
            className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                <FolderOpen className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                View Collections
              </h3>
              <p className="text-sm text-gray-600">
                {collections.length === 0 
                  ? 'No collections yet' 
                  : `${collections.length} collection${collections.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>

        {!loading && collections.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Collections ({Math.min(collections.length, 3)})
            </h2>
            <div className="grid gap-3">
              {collections.slice(0, 3).map((collection) => (
                <div
                  key={collection.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/collections/${collection.id}`)}
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
                  onClick={() => navigate('/collections/list')}
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
              onClick={() => navigate('/collections/new')}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Collection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Collections;