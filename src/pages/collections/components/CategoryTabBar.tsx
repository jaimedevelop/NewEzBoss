// src/pages/collections/components/CollectionsScreen/components/CategoryTabBar.tsx
import React, { useMemo, useCallback } from 'react';
import { Star, Plus, X } from 'lucide-react';
import type { 
  CategoryTab, 
  ItemSelection, 
  CollectionContentType 
} from '../../../services/collections';


interface CategoryTabBarProps {
  collectionName: string;
  contentType: CollectionContentType;
  categoryTabs: CategoryTab[];
  activeTabIndex: number;
  selections: Record<string, ItemSelection>;
  onTabChange: (index: number) => void;
  onAddCategories?: () => void;
  onRemoveCategory?: (categoryTabId: string) => void;
}

const CategoryTabBar: React.FC<CategoryTabBarProps> = ({
  collectionName,
  contentType,
  categoryTabs,
  activeTabIndex,
  selections,
  onTabChange,
  onAddCategories,
  onRemoveCategory,
}) => {
  // Filter tabs by content type
  const filteredTabs = useMemo(() => {
    return categoryTabs.filter(tab => tab.type === contentType);
  }, [categoryTabs, contentType]);

  const hasDuplicateCategoryNames = useMemo(() => {
    const categoryNames = filteredTabs.map(t => t.category);
    const uniqueNames = new Set(categoryNames);
    return uniqueNames.size !== categoryNames.length;
  }, [filteredTabs]);

  const getTabSelectionCount = useCallback((tabId: string): { selected: number; total: number } => {
    const tab = filteredTabs.find(t => t.id === tabId);
    if (!tab) return { selected: 0, total: 0 };
    
    const total = tab.itemIds.length;
    const selected = tab.itemIds.filter(itemId => selections[itemId]?.isSelected).length;
    
    return { selected, total };
  }, [filteredTabs, selections]);

  const totalSelected = useMemo(() => {
    return Object.values(selections).filter(sel => sel.isSelected).length;
  }, [selections]);

  const getDisplayName = (tab: CategoryTab): string => {
    if (hasDuplicateCategoryNames) {
      return `${tab.section} - ${tab.category}`;
    }
    return tab.category;
  };

    const handleRemoveClick = (e: React.MouseEvent, tabId: string, tabName: string) => {
    e.stopPropagation();
    
    if (!onRemoveCategory) return;
    
    const { selected } = getTabSelectionCount(tabId);
    const confirmMessage = selected > 0
      ? `Remove "${tabName}" category?\n\nThis will also remove ${selected} selected item${selected !== 1 ? 's' : ''} from this collection.`
      : `Remove "${tabName}" category?`;
    
    if (window.confirm(confirmMessage)) {
      onRemoveCategory(tabId);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="flex items-center space-x-1 py-2">
          {/* Master Tab */}
          <button
            onClick={() => onTabChange(0)}
            className={`
              flex items-center gap-2 px-4 py-2.5 min-w-[140px] max-w-[220px] rounded-t-lg transition-all duration-200 border-b-2
              ${activeTabIndex === 0
                ? 'bg-orange-50 border-orange-500 text-orange-700'
                : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <Star className={`w-4 h-4 ${activeTabIndex === 0 ? 'fill-orange-500 text-orange-500' : 'text-gray-400'}`} />
            <span className="flex-1 text-sm font-semibold truncate text-left">
              {collectionName}
            </span>
            {totalSelected > 0 && (
              <span className={`
                px-2 py-0.5 text-xs rounded-full font-bold
                ${activeTabIndex === 0 
                  ? 'bg-orange-200 text-orange-800' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {totalSelected}
              </span>
            )}
          </button>

          {/* Category Tabs */}
          {filteredTabs.map((tab, index) => {
            const tabIndex = index + 1;
            const { selected, total } = getTabSelectionCount(tab.id);
            const isActive = activeTabIndex === tabIndex;
            const percentage = total > 0 ? (selected / total) * 100 : 0;
            const displayName = getDisplayName(tab);

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tabIndex)}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 min-w-[120px] max-w-[200px] rounded-t-lg transition-all duration-200 border-b-2
                  ${isActive
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-50'
                  }
                `}
                title={hasDuplicateCategoryNames ? `${tab.section} - ${tab.category}` : tab.category}
              >
                {percentage > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 h-0.5 bg-green-500 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                <span className={`
                  flex-1 text-sm font-medium truncate text-left
                  ${isActive ? 'font-semibold' : ''}
                `}>
                  {displayName}
                </span>
                <span className={`
                  text-xs font-semibold whitespace-nowrap
                  ${selected === total && total > 0
                    ? 'text-green-600'
                    : selected > 0
                    ? 'text-orange-600'
                    : 'text-gray-400'
                  }
                `}>
                  {selected}/{total}
                </span>
                {onRemoveCategory && (
                  <button
                    onClick={(e) => handleRemoveClick(e, tab.id, displayName)}
                    className="opacity-100 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-red-100 relative z-20"
                    title="Remove category"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </button>
            );
          })}

          {/* Add Categories Button */}
          {onAddCategories && filteredTabs.length === 0 && (
            <button
              onClick={onAddCategories}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Add Categories</span>
            </button>
          )}

          {/* Edit/Add More Button for existing tabs */}
          {onAddCategories && filteredTabs.length > 0 && (
            <button
              onClick={onAddCategories}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors ml-2"
              title="Add more categories"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabBar;