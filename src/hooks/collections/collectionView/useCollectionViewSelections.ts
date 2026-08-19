// src/hooks/collections/collectionView/useCollectionViewSelections.ts
import { useState, useCallback } from 'react';
import { Collection, CollectionContentType, ItemSelection } from '../../../services/collections';

interface SelectionsState {
  products: Record<string, ItemSelection>;
  labor: Record<string, ItemSelection>;
  tools: Record<string, ItemSelection>;
  equipment: Record<string, ItemSelection>;
}

export interface UseCollectionViewSelectionsResult {
  liveSelections: SelectionsState;
  setLiveSelections: React.Dispatch<React.SetStateAction<SelectionsState>>;
  syncSelectionsFromCollection: (collection: Collection) => void;
}

export const useCollectionViewSelections = (): UseCollectionViewSelectionsResult => {
  const [liveSelections, setLiveSelections] = useState<SelectionsState>({
    products: {},
    labor: {},
    tools: {},
    equipment: {},
  });

  const syncSelectionsFromCollection = useCallback((collection: Collection) => {
    setLiveSelections({
      products: collection.productSelections || {},
      labor: collection.laborSelections || {},
      tools: collection.toolSelections || {},
      equipment: collection.equipmentSelections || {},
    });
  }, []);

  return {
    liveSelections,
    setLiveSelections,
    syncSelectionsFromCollection,
  };
};