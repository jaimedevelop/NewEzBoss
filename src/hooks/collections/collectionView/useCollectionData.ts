// src/hooks/collections/collectionView/useCollectionData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Collection, getCollection } from '../../../services/collections';

export interface UseCollectionDataResult {
  collection: Collection | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  replaceCollection: (collection: Collection) => void;
}

/**
 * Fetches a collection by ID. Previously subscribed to Firestore for
 * realtime updates (subscribeToCollection); the REST backend has no push
 * channel, so this now does a one-shot fetch on mount/collectionId change
 * plus an exposed `refetch` for callers to invoke after mutations elsewhere.
 */
export const useCollectionData = (collectionId: string | undefined): UseCollectionDataResult => {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedCollectionId = useRef<string | undefined>();

  const fetchCollection = useCallback(async () => {
    if (!collectionId) {
      setError('No collection ID provided');
      setLoading(false);
      return;
    }

    // A manual refresh should not unmount an already-visible editor.
    if (loadedCollectionId.current !== collectionId) setLoading(true);
    setError(null);

    const result = await getCollection(collectionId);

    if (result.success && result.data) {
      setCollection(result.data);
      loadedCollectionId.current = collectionId;
      setLoading(false);
    } else {
      setError(typeof result.error === 'string' ? result.error : 'Collection not found');
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const replaceCollection = useCallback((nextCollection: Collection) => {
    setCollection(nextCollection);
    setError(null);
  }, []);

  return { collection, loading, error, refetch: fetchCollection, replaceCollection };
};
