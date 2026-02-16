// src/pages/collections/components/CollectionsScreen/components/CategoryTabBar.tsx
import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Star, Plus, X, Settings, FolderOpen } from 'lucide-react';
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
  // NEW: Grouping props
  sectionGrouping?: Record<string, boolean>; // sectionId -> isCollapsed
  onToggleSectionGroup?: (sectionId: string) => void;
  onOpenGroupingPanel?: () => void;
}

interface VisibleTab {
  type: 'category' | 'section';
  id: string;
  name: string;
  // For category tabs
  categoryTab?: CategoryTab;
  // For section tabs
  sectionId?: string;
  sectionName?: string;
  tabs?: CategoryTab[];
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
  sectionGrouping = {},
  onToggleSectionGroup,
  onOpenGroupingPanel,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Check if scroll container is overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (scrollContainerRef.current) {
        const hasOverflow = scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth;
        setIsOverflowing(hasOverflow);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [categoryTabs, sectionGrouping]);

  // Filter tabs by content type
  const filteredTabs = useMemo(() => {
    return categoryTabs.filter(tab => tab.type === contentType);
  }, [categoryTabs, contentType]);

  // Compute visible tabs (considering grouping)
  const visibleTabs = useMemo((): VisibleTab[] => {
    // Group tabs by section
    const sectionMap = new Map<string, CategoryTab[]>();
    filteredTabs.forEach(tab => {
      const sectionId = tab.section;
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      sectionMap.get(sectionId)!.push(tab);
    });

    const visible: VisibleTab[] = [];

    sectionMap.forEach((tabs, sectionId) => {
      const isCollapsed = sectionGrouping[sectionId] && tabs.length >= 2;

      if (isCollapsed) {
        // Collapsed: show section tab
        visible.push({
          type: 'section',
          id: `section-${sectionId}`,
          name: tabs[0].section,
          sectionId,
          sectionName: tabs[0].section,
          tabs,
        });
      } else {
        // Expanded: show individual category tabs
        tabs.forEach(tab => {
          visible.push({
            type: 'category',
            id: tab.id,
            name: tab.category,
            categoryTab: tab,
          });
        });
      }
    });

    return visible;
  }, [filteredTabs, sectionGrouping]);

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

  const getSectionSelectionCount = useCallback((tabs: CategoryTab[]): { selected: number; total: number } => {
    let totalItems = 0;
    let selectedItems = 0;

    tabs.forEach(tab => {
      totalItems += tab.itemIds.length;
      selectedItems += tab.itemIds.filter(itemId => selections[itemId]?.isSelected).length;
    });

    return { selected: selectedItems, total: totalItems };
  }, [selections]);

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

  // Map visible tab index to actual tab index for parent component
  const handleTabClick = (visibleIndex: number) => {
    if (visibleIndex === 0) {
      // Master tab
      onTabChange(0);
      return;
    }

    const visibleTab = visibleTabs[visibleIndex - 1];

    if (visibleTab.type === 'section') {
      // For section tabs, use the first category tab's index
      const firstCategoryTab = visibleTab.tabs?.[0];
      if (firstCategoryTab) {
        const actualIndex = filteredTabs.findIndex(t => t.id === firstCategoryTab.id);
        onTabChange(actualIndex + 1);
      }
    } else if (visibleTab.categoryTab) {
      // For category tabs, find the actual index
      const actualIndex = filteredTabs.findIndex(t => t.id === visibleTab.categoryTab!.id);
      onTabChange(actualIndex + 1);
    }
  };

  // Determine if a visible tab is active
  const isTabActive = (visibleIndex: number): boolean => {
    if (visibleIndex === 0) return activeTabIndex === 0;
    if (activeTabIndex === 0) return false;

    const visibleTab = visibleTabs[visibleIndex - 1];
    const activeTab = filteredTabs[activeTabIndex - 1];

    if (!activeTab) return false;

    if (visibleTab.type === 'section') {
      // Section tab is active if the active tab belongs to this section
      return visibleTab.tabs?.some(t => t.id === activeTab.id) || false;
    } else {
      // Category tab is active if IDs match
      return visibleTab.categoryTab?.id === activeTab.id;
    }
  };

  const ControlButtons = ({ className = "" }: { className?: string }) => (
    <>
      {onAddCategories && (
        <button
          onClick={onAddCategories}
          className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
          title="Add categories"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      )}
      {onOpenGroupingPanel && (
        <button
          onClick={onOpenGroupingPanel}
          className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
          title="Manage tab grouping"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </>
  );

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center px-4">
        <div ref={scrollContainerRef} className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-w-0">
          <div className="flex items-center space-x-1 py-2 w-max">
            {/* Master Tab */}
            <button
              onClick={() => handleTabClick(0)}
              className={`
                flex items-center gap-2 px-4 py-2.5 min-w-[140px] max-w-[220px] rounded-t-lg transition-all duration-200 border-b-2
                ${isTabActive(0)
                  ? 'bg-orange-50 border-orange-500 text-orange-700'
                  : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <Star className={`w-4 h-4 ${isTabActive(0) ? 'fill-orange-500 text-orange-500' : 'text-gray-400'}`} />
              <span className="flex-1 text-sm font-semibold truncate text-left">
                {collectionName}
              </span>
              {totalSelected > 0 && (
                <span className={`
                  px-2 py-0.5 text-xs rounded-full font-bold
                  ${isTabActive(0)
                    ? 'bg-orange-200 text-orange-800'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {totalSelected}
                </span>
              )}
            </button>

            {/* Visible Tabs (Category or Section) */}
            {visibleTabs.map((visibleTab, index) => {
              const tabIndex = index + 1;
              const isActive = isTabActive(tabIndex);

              if (visibleTab.type === 'section') {
                // Section Tab (Collapsed)
                const { selected, total } = getSectionSelectionCount(visibleTab.tabs || []);
                const percentage = total > 0 ? (selected / total) * 100 : 0;

                return (
                  <button
                    key={visibleTab.id}
                    onClick={() => handleTabClick(tabIndex)}
                    className={`
                      relative flex items-center gap-2 px-4 py-2.5 min-w-[140px] max-w-[220px] rounded-t-lg transition-all duration-200 border-b-2
                      ${isActive
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-50'
                      }
                    `}
                    title={`Section: ${visibleTab.sectionName} (${visibleTab.tabs?.length} categories)`}
                  >
                    {percentage > 0 && (
                      <div
                        className="absolute bottom-0 left-0 h-0.5 bg-green-500 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    )}

                    <FolderOpen className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-500'}`} />
                    <span className={`
                      flex-1 text-sm font-medium truncate text-left
                      ${isActive ? 'font-semibold' : ''}
                    `}>
                      {visibleTab.sectionName}
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
                  </button>
                );
              } else {
                // Category Tab (Expanded)
                const tab = visibleTab.categoryTab!;
                const { selected, total } = getTabSelectionCount(tab.id);
                const percentage = total > 0 ? (selected / total) * 100 : 0;
                const displayName = getDisplayName(tab);

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tabIndex)}
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
              }
            })}

            {/* Add Categories Button (when no tabs exist) */}
            {onAddCategories && filteredTabs.length === 0 && (
              <button
                onClick={onAddCategories}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">Add Categories</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Control Buttons (always visible when tabs exist) */}
        {filteredTabs.length > 0 && (
          <div className="flex items-center space-x-1 ml-2 py-2">
            <ControlButtons />
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryTabBar;