// src/pages/collections/Collections.tsx
import React, { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import CollectionsTabBar from './components/CollectionsTabBar';
import CollectionsScreen from './components/CollectionsScreen';

const Collections: React.FC = () => {
  const [view, setView] = useState<'landing' | 'collections'>('landing');
  const [activeTab, setActiveTab] = useState(0);

  // Mock data for collections - will be replaced with Firebase data
  const [collections, setCollections] = useState([
    { id: 1, name: 'Toilet Installation', category: 'Plumbing' },
    { id: 2, name: 'Drain Cleaning', category: 'Plumbing' },
    { id: 3, name: 'Pipe Repair', category: 'Plumbing' }
  ]);

  const handleAddCollection = () => {
    // This will open a modal or navigate to create collection form
    console.log('Add new collection');
    // For now, we'll add a mock collection
    const newCollection = {
      id: collections.length + 1,
      name: `New Collection ${collections.length + 1}`,
      category: 'General'
    };
    setCollections([...collections, newCollection]);
    setActiveTab(collections.length); // Switch to new tab
    setView('collections'); // Go to collections view
  };

  if (view === 'landing') {
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
              onClick={handleAddCollection}
              className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-orange-500 transition-all duration-300 hover:shadow-lg"
            >
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mb-4 group-hover:bg-orange-200 transition-colors">
                  <Plus className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Add Collection
                </h3>
                <p className="text-sm text-gray-600">
                  Create a new workflow template
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            <button
              onClick={() => setView('collections')}
              className="group relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-all duration-300 hover:shadow-lg"
            >
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                  <FolderOpen className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Go to Collections
                </h3>
                <p className="text-sm text-gray-600">
                  View and manage existing templates
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

          {/* Recent Collections Preview */}
          {collections.length > 0 && (
            <div className="mt-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Collections
              </h2>
              <div className="grid gap-3">
                {collections.slice(0, 3).map((collection) => (
                  <div
                    key={collection.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setActiveTab(collections.findIndex(c => c.id === collection.id));
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
                      <span className="text-sm text-gray-500">
                        {collection.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-hidden">
        <CollectionsScreen 
          collection={collections[activeTab]} 
          onBack={() => setView('landing')}
        />
      </div>
      <CollectionsTabBar
        collections={collections}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddCollection={handleAddCollection}
      />
    </div>
  );
};

export default Collections;