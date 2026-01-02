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
  syncSelectionsFromFirebase: (collection: Collection) => void;
}

/**
 * Manages live selection state for all content types.
 * Provides methods to sync from Firebase and update locally.
 */
export const useCollectionViewSelections = (): UseCollectionViewSelectionsResult => {
  const [liveSelections, setLiveSelections] = useState<SelectionsState>({
    products: {},
    labor: {},
    tools: {},
    equipment: {},
  });

  const syncSelectionsFromFirebase = useCallback((collection: Collection) => {
    console.log('🔄 Syncing selections from Firebase');
    
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
    syncSelectionsFromFirebase,
  };
};