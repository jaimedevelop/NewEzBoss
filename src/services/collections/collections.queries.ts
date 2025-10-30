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
 */
export const getCollections = async (
  filters: CollectionFilters = {}
): Promise<DatabaseResult<Collection[]>> => {
  try {
    let q = query(collection(db, COLLECTIONS_COLLECTION));

    // Add filters
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    // Order by name
    q = query(q, orderBy('name', 'asc'));

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const collections: Collection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Collection[];

    return { success: true, data: collections };
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
    // Note: Firestore doesn't support full-text search natively
    // This gets all collections and filters client-side
    
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

    // Add filters
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    // Order by name
    q = query(q, orderBy('name', 'asc'));

    return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
      const collections: Collection[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Collection[];
      callback(collections);
    });
  } catch (error) {
    console.error('Error subscribing to collections:', error);
    return null;
  }
};