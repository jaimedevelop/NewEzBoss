// src/services/collections/collections.queries.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type {
  Collection,
  CollectionFilters,
  DatabaseResult,
} from './collections.types';

const COLLECTIONS_COLLECTION = 'collections';

const sortByRecentAccess = (collections: Collection[]): Collection[] => {
  return [...collections].sort((a, b) => {
    const aTime = (a.lastAccessedAt as any)?.toMillis?.() ?? (a.createdAt as any)?.toMillis?.() ?? 0;
    const bTime = (b.lastAccessedAt as any)?.toMillis?.() ?? (b.createdAt as any)?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
};

/**
 * Get a single collection by ID
 */
export const getCollection = async (
  collectionId: string
): Promise<DatabaseResult<Collection>> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const docSnap: DocumentSnapshot = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() } as Collection,
      };
    } else {
      return { success: false, error: 'Collection not found' };
    }
  } catch (error) {
    console.error('Error getting collection:', error);
    return { success: false, error };
  }
};

/**
 * Get all collections with optional filtering
 * Sorted client-side by lastAccessedAt desc, falling back to createdAt desc
 */
export const getCollections = async (
  filters: CollectionFilters = {}
): Promise<DatabaseResult<Collection[]>> => {
  try {
    let q = query(collection(db, COLLECTIONS_COLLECTION));

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const collections: Collection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Collection[];

    return { success: true, data: sortByRecentAccess(collections) };
  } catch (error) {
    console.error('Error getting collections:', error);
    return { success: false, error };
  }
};

/**
 * Get collections by category
 */
export const getCollectionsByCategory = async (
  category: string
): Promise<DatabaseResult<Collection[]>> => {
  return await getCollections({ category });
};

/**
 * Search collections by name
 */
export const searchCollections = async (
  searchTerm: string
): Promise<DatabaseResult<Collection[]>> => {
  try {
    const allCollections = await getCollections();
    if (!allCollections.success || !allCollections.data) {
      return allCollections;
    }

    const filteredCollections = allCollections.data.filter(collection =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.description && collection.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return { success: true, data: filteredCollections };
  } catch (error) {
    console.error('Error searching collections:', error);
    return { success: false, error };
  }
};

/**
 * Real-time subscription to collections
 */
export const subscribeToCollections = (
  callback: (collections: Collection[]) => void,
  filters: CollectionFilters = {}
): Unsubscribe | null => {
  try {
    let q = query(collection(db, COLLECTIONS_COLLECTION));

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
      const collections: Collection[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Collection[];
      callback(sortByRecentAccess(collections));
    });
  } catch (error) {
    console.error('Error subscribing to collections:', error);
    return null;
  }
};

/**
 * Real-time subscription to a single collection
 */
export const subscribeToCollection = (
  collectionId: string,
  callback: (collection: Collection | null) => void
): Unsubscribe | null => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);

    return onSnapshot(docRef, (docSnap: DocumentSnapshot) => {
      if (docSnap.exists()) {
        const collection = { id: docSnap.id, ...docSnap.data() } as Collection;
        callback(collection);
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.error('Error subscribing to collection:', error);
    return null;
  }
};