// src/hooks/collections/collectionView/useCollectionViewState.ts
import { useState, useCallback } from 'react';
import { Collection, CollectionContentType, CategoryTab, ItemSelection } from '../../../services/collections';

type CollectionViewType = 'summary' | CollectionContentType;

interface TabIndices {
  products: number;
  labor: number;
  tools: number;
  equipment: number;
}

export interface UseCollectionViewStateResult {
  activeView: CollectionViewType;
  setActiveView: (view: CollectionViewType) => void;
  activeCategoryTabIndex: number;
  setActiveCategoryTabIndex: (index: number) => void;
  getCurrentTabsAndSelections: (
    collection: Collection | null,
    liveSelections: {
      products: Record<string, ItemSelection>;
      labor: Record<string, ItemSelection>;
      tools: Record<string, ItemSelection>;
      equipment: Record<string, ItemSelection>;
    }
  ) => {
    tabs: CategoryTab[];
    selections: Record<string, ItemSelection>;
  };
  handleViewChange: (view: CollectionViewType, collection: Collection | null) => void;
}

/**
 * Manages active view state and tab indices.
 * Handles view switching and tab navigation.
 */
export const useCollectionViewState = (): UseCollectionViewStateResult => {
  const [activeView, setActiveView] = useState<CollectionViewType>('summary');
  const [tabIndexByType, setTabIndexByType] = useState<TabIndices>({
    products: 0,
    labor: 0,
    tools: 0,
    equipment: 0,
  });

  const activeCategoryTabIndex = activeView === 'summary' ? 0 : tabIndexByType[activeView];

  const setActiveCategoryTabIndex = useCallback((index: number) => {
    if (activeView !== 'summary') {
      setTabIndexByType(prev => ({
        ...prev,
        [activeView]: index,
      }));
    }
  }, [activeView]);

  const getCurrentTabsAndSelections = useCallback((
    collection: Collection | null,
    liveSelections: {
      products: Record<string, ItemSelection>;
      labor: Record<string, ItemSelection>;
      tools: Record<string, ItemSelection>;
      equipment: Record<string, ItemSelection>;
    }
  ) => {
    if (!collection || activeView === 'summary') {
      return { tabs: [], selections: {} };
    }

    switch (activeView) {
      case 'products':
        return {
          tabs: collection.productCategoryTabs || [],
          selections: liveSelections.products,
        };
      case 'labor':
        return {
          tabs: collection.laborCategoryTabs || [],
          selections: liveSelections.labor,
        };
      case 'tools':
        return {
          tabs: collection.toolCategoryTabs || [],
          selections: liveSelections.tools,
        };
      case 'equipment':
        return {
          tabs: collection.equipmentCategoryTabs || [],
          selections: liveSelections.equipment,
        };
    }
  }, [activeView]);

  const handleViewChange = useCallback((view: CollectionViewType, collection: Collection | null) => {
    setActiveView(view);

    if (view !== 'summary') {
      const tabs = view === 'products' ? collection?.productCategoryTabs :
        view === 'labor' ? collection?.laborCategoryTabs :
          view === 'tools' ? collection?.toolCategoryTabs :
            collection?.equipmentCategoryTabs;

      if (!tabs || tabs.length === 0) {
        setActiveCategoryTabIndex(0);
      }
    }
  }, [setActiveCategoryTabIndex]);

  return {
    activeView,
    setActiveView,
    activeCategoryTabIndex,
    setActiveCategoryTabIndex,
    getCurrentTabsAndSelections,
    handleViewChange,
  };
};