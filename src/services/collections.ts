// src/firebase/collections.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Collection names
const COLLECTIONS_COLLECTION = 'collections';

// Types
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

export interface CategorySelection {
  trade?: string;
  sections: string[];
  categories: string[];
  subcategories: string[];
  types: string[];
  description?: string;
}

export interface AssignedProduct {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  notes?: string;
}

export interface Collection {
  id?: string;
  name: string;
  category: string; // Keep for backwards compatibility, but use categorySelection for filtering
  description?: string;
  estimatedHours: number;
  categorySelection: CategorySelection; // New: stores selected category filters
  assignedProducts: AssignedProduct[]; // New: replaces tools/materials/steps
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  userId?: string; // For multi-user support later
}

export interface CollectionFilters {
  category?: string;
  userId?: string;
}

// === COLLECTIONS OPERATIONS ===

/**
 * Create a new collection
 */
export const createCollection = async (
  collectionData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DatabaseResult> => {
  try {
    // Validate required fields
    if (!collectionData.name || !collectionData.category) {
      return { success: false, error: 'Name and category are required' };
    }

    const docRef: DocumentReference = await addDoc(
      collection(db, COLLECTIONS_COLLECTION),
      {
        ...collectionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating collection:', error);
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
    let q = collection(db, COLLECTIONS_COLLECTION);

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
 * Update an existing collection
 */
export const updateCollection = async (
  collectionId: string,
  collectionData: Partial<Collection>
): Promise<DatabaseResult> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    
    // Remove id from update data if present
    const { id, ...dataToUpdate } = collectionData;
    
    await updateDoc(docRef, {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating collection:', error);
    return { success: false, error };
  }
};

/**
 * Delete a collection
 */
export const deleteCollection = async (
  collectionId: string
): Promise<DatabaseResult> => {
  try {
    const docRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting collection:', error);
    return { success: false, error };
  }
};

/**
 * Duplicate a collection
 */
export const duplicateCollection = async (
  collectionId: string,
  newName?: string
): Promise<DatabaseResult> => {
  try {
    // Get the original collection
    const originalResult = await getCollection(collectionId);
    if (!originalResult.success || !originalResult.data) {
      return { success: false, error: 'Original collection not found' };
    }

    const original = originalResult.data;
    
    // Create new collection data
    const duplicatedData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
      name: newName || `${original.name} (Copy)`,
      category: original.category,
      description: original.description,
      estimatedHours: original.estimatedHours,
      tools: original.tools.map(tool => ({
        ...tool,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate new IDs
      })),
      materials: original.materials.map(material => ({
        ...material,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate new IDs
      })),
      steps: original.steps.map(step => ({
        ...step,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate new IDs
        completed: false, // Reset completion status
      })),
      userId: original.userId,
    };

    return await createCollection(duplicatedData);
  } catch (error) {
    console.error('Error duplicating collection:', error);
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
    // This is a basic implementation that gets all collections and filters client-side
    // For production, consider using Algolia or similar service
    
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
    let q = collection(db, COLLECTIONS_COLLECTION);

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

/**
 * Batch operations for collections
 */
export const batchUpdateCollections = async (
  updates: Array<{ id: string; data: Partial<Collection> }>
): Promise<DatabaseResult> => {
  try {
    const batch = writeBatch(db);

    updates.forEach(({ id, data }) => {
      const docRef = doc(db, COLLECTIONS_COLLECTION, id);
      const { id: dataId, ...updateData } = data; // Remove id from update data
      batch.update(docRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error batch updating collections:', error);
    return { success: false, error };
  }
};

/**
 * Get collections statistics
 */
export const getCollectionsStats = async (): Promise<DatabaseResult<{
  total: number;
  byCategory: Record<string, number>;
  averageTools: number;
  averageMaterials: number;
  averageSteps: number;
  averageHours: number;
}>> => {
  try {
    const result = await getCollections();
    if (!result.success || !result.data) {
      return result;
    }

    const collections = result.data;
    const total = collections.length;

    // Count by category
    const byCategory = collections.reduce((acc, collection) => {
      acc[collection.category] = (acc[collection.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate averages
    const averageTools = total > 0 
      ? collections.reduce((sum, c) => sum + c.tools.length, 0) / total 
      : 0;
    
    const averageMaterials = total > 0 
      ? collections.reduce((sum, c) => sum + c.materials.length, 0) / total 
      : 0;
    
    const averageSteps = total > 0 
      ? collections.reduce((sum, c) => sum + c.steps.length, 0) / total 
      : 0;
    
    const averageHours = total > 0 
      ? collections.reduce((sum, c) => sum + c.estimatedHours, 0) / total 
      : 0;

    return {
      success: true,
      data: {
        total,
        byCategory,
        averageTools: Math.round(averageTools * 10) / 10,
        averageMaterials: Math.round(averageMaterials * 10) / 10,
        averageSteps: Math.round(averageSteps * 10) / 10,
        averageHours: Math.round(averageHours * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Error getting collections stats:', error);
    return { success: false, error };
  }
};

/**
 * Create a collection with category selection
 */
export const createCollectionWithCategories = async (
  name: string,
  categorySelection: CategorySelection,
  estimatedHours: number = 0
): Promise<DatabaseResult> => {
  try {
    // Validate required fields
    if (!name || !categorySelection.trade) {
      return { success: false, error: 'Name and trade selection are required' };
    }

    const collectionData: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      category: categorySelection.trade, // Use trade as primary category for backwards compatibility
      description: categorySelection.description || `Collection for ${categorySelection.trade} products`,
      estimatedHours,
      categorySelection,
      assignedProducts: [],
    };

    const docRef: DocumentReference = await addDoc(
      collection(db, COLLECTIONS_COLLECTION),
      {
        ...collectionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating collection with categories:', error);
    return { success: false, error };
  }
};

/**
 * Add a product to a collection
 */
export const addProductToCollection = async (
  collectionId: string,
  product: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    notes?: string;
  }
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const assignedProducts = [...(currentData.assignedProducts || [])];

    // Check if product already exists
    const existingIndex = assignedProducts.findIndex(p => p.productId === product.productId);
    
    if (existingIndex >= 0) {
      // Update existing product quantity
      assignedProducts[existingIndex].quantity += product.quantity;
      if (product.notes) {
        assignedProducts[existingIndex].notes = product.notes;
      }
    } else {
      // Add new product
      const newAssignedProduct: AssignedProduct = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...product,
      };
      assignedProducts.push(newAssignedProduct);
    }

    await updateDoc(collectionRef, {
      assignedProducts,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding product to collection:', error);
    return { success: false, error };
  }
};

/**
 * Remove a product from a collection
 */
export const removeProductFromCollection = async (
  collectionId: string,
  assignedProductId: string
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const assignedProducts = (currentData.assignedProducts || []).filter(
      p => p.id !== assignedProductId
    );

    await updateDoc(collectionRef, {
      assignedProducts,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing product from collection:', error);
    return { success: false, error };
  }
};

/**
 * Update product quantity in collection
 */
export const updateProductQuantityInCollection = async (
  collectionId: string,
  assignedProductId: string,
  newQuantity: number
): Promise<DatabaseResult> => {
  try {
    const collectionRef = doc(db, COLLECTIONS_COLLECTION, collectionId);
    const collectionSnap = await getDoc(collectionRef);

    if (!collectionSnap.exists()) {
      return { success: false, error: 'Collection not found' };
    }

    const currentData = collectionSnap.data() as Collection;
    const assignedProducts = [...(currentData.assignedProducts || [])];
    
    const productIndex = assignedProducts.findIndex(p => p.id === assignedProductId);
    if (productIndex >= 0) {
      if (newQuantity <= 0) {
        // Remove product if quantity is 0 or less
        assignedProducts.splice(productIndex, 1);
      } else {
        assignedProducts[productIndex].quantity = newQuantity;
      }

      await updateDoc(collectionRef, {
        assignedProducts,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } else {
      return { success: false, error: 'Product not found in collection' };
    }
  } catch (error) {
    console.error('Error updating product quantity:', error);
    return { success: false, error };
  }
};

export default {
  createCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  duplicateCollection,
  getCollectionsByCategory,
  searchCollections,
  subscribeToCollections,
  batchUpdateCollections,
  getCollectionsStats,
  createCollectionWithCategories,
  addProductToCollection,
  removeProductFromCollection,
  updateProductQuantityInCollection,
};