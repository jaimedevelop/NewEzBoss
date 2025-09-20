// src/pages/collections/components/CollectionsTabBar.tsx
import React from 'react';
import { Plus, X } from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  category: string;
}

interface CollectionsTabBarProps {
  collections: Collection[];
  activeTab: number;
  onTabChange: (index: number) => void;
  onAddCollection: () => void;
}

const CollectionsTabBar: React.FC<CollectionsTabBarProps> = ({
  collections,
  activeTab,
  onTabChange,
  onAddCollection
}) => {
  return (
    <div className="bg-gray-100 border-t border-gray-300">
      <div className="flex items-center h-12 px-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <div className="flex items-center space-x-1">
          {collections.map((collection, index) => (
            <button
              key={collection.id}
              onClick={() => onTabChange(index)}
              className={`
                group flex items-center px-4 py-2 min-w-[120px] max-w-[200px] rounded-t-lg transition-all duration-200
                ${activeTab === index
                  ? 'bg-white border-t border-l border-r border-gray-300 shadow-sm -mb-[1px] pb-[9px]'
                  : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                }
              `}
            >
              <span className={`
                flex-1 text-sm font-medium truncate text-left
                ${activeTab === index ? 'text-gray-900' : 'text-gray-600'}
              `}>
                {collection.name}
              </span>
              {activeTab === index && collections.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle close tab logic here
                    console.log('Close tab:', collection.id);
                  }}
                  className="ml-2 p-0.5 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </button>
          ))}
          
          {/* Add Collection Tab Button */}
          <button
            onClick={onAddCollection}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
            title="Add new collection"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollectionsTabBar;