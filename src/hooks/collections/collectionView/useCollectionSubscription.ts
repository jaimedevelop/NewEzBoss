// src/hooks/collections/collectionView/useCollectionSubscription.ts
import { useState, useEffect } from 'react';
import { Collection, subscribeToCollection } from '../../../services/collections';

export interface UseCollectionSubscriptionResult {
  collection: Collection | null;
  loading: boolean;
  error: string | null;
}

/**
 * Manages Firebase real-time subscription for a collection.
 * Automatically handles loading states, errors, and cleanup.
 */
export const useCollectionSubscription = (collectionId: string | undefined): UseCollectionSubscriptionResult => {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) {
      setError('No collection ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    console.log('🔄 Setting up real-time listener for collection:', collectionId);

    // Timeout fallback to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
      setError('Loading timeout - please refresh the page');
    }, 10000);

    const unsubscribe = subscribeToCollection(collectionId, (updatedCollection) => {
      clearTimeout(timeout);

      if (updatedCollection) {
        console.log('📥 SUBSCRIPTION UPDATE FROM FIREBASE');
        console.log('📥 Collection ID:', updatedCollection.id);
        
        setCollection(updatedCollection);
        setLoading(false);
      } else {
        setError('Collection not found');
        setLoading(false);
      }
    });

    // Handle subscription failure
    if (!unsubscribe) {
      clearTimeout(timeout);
      setError('Failed to connect to database');
      setLoading(false);
      return;
    }

    return () => {
      clearTimeout(timeout);
      console.log('🔌 Cleaning up real-time listener for collection:', collectionId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [collectionId]);

  return { collection, loading, error };
};