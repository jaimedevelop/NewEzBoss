// src/services/labor/labor.queries.ts
import { 
  collection, 
  doc,
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { 
  LaborItem, 
  LaborFilters, 
  LaborResponse, 
  PaginatedLaborResponse 
} from './labor.types';

const LABOR_COLLECTION = 'labor_items';

/**
 * Get a single labor item by ID
 */
export const getLaborItem = async (
  laborId: string
): Promise<LaborResponse<LaborItem>> => {
  try {
    const laborRef = doc(db, LABOR_COLLECTION, laborId);
    const laborDoc = await getDoc(laborRef);
    
    if (!laborDoc.exists()) {
      return { success: false, error: 'Labor item not found' };
    }
    
    return {
      success: true,
      data: { id: laborDoc.id, ...laborDoc.data() } as LaborItem
    };
  } catch (error) {
    console.error('Error getting labor item:', error);
    return { success: false, error: 'Failed to fetch labor item' };
  }
};

/**
 * Get all labor items with optional filters and pagination
 */
export const getLaborItems = async (
  userId: string,
  filters?: LaborFilters,
  pageSize: number = 999,
  lastDoc?: any
): Promise<LaborResponse<PaginatedLaborResponse>> => {
  try {
    const laborRef = collection(db, LABOR_COLLECTION);
    let q = query(
      laborRef,
      where('userId', '==', userId),
      orderBy('name', 'asc'),
      limit(pageSize + 1)
    );
    
    // Apply filters
    if (filters?.tradeId) {
      q = query(q, where('tradeId', '==', filters.tradeId));
    }
    
    if (filters?.sectionId) {
      q = query(q, where('sectionId', '==', filters.sectionId));
    }
    
    if (filters?.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }
    
    if (filters?.isActive !== undefined) {
      q = query(q, where('isActive', '==', filters.isActive));
    }
    
    // Apply pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    let laborItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LaborItem[];
    
    // Apply search filter (client-side)
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      laborItems = laborItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.tradeName?.toLowerCase().includes(searchLower) ||
        item.sectionName?.toLowerCase().includes(searchLower) ||
        item.categoryName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Check if there are more results
    const hasMore = laborItems.length > pageSize;
    if (hasMore) {
      laborItems = laborItems.slice(0, pageSize);
    }
    
    return {
      success: true,
      data: {
        laborItems,
        hasMore,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      }
    };
  } catch (error) {
    console.error('Error getting labor items:', error);
    return { success: false, error: 'Failed to fetch labor items' };
  }
};

/**
 * Get labor items by trade
 */
export const getLaborItemsByTrade = async (
  userId: string,
  trade: string
): Promise<LaborResponse<LaborItem[]>> => {
  try {
    const laborRef = collection(db, LABOR_COLLECTION);
    const q = query(
      laborRef,
      where('userId', '==', userId),
      where('trade', '==', trade),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const laborItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LaborItem[];
    
    return { success: true, data: laborItems };
  } catch (error) {
    console.error('Error getting labor items by trade:', error);
    return { success: false, error: 'Failed to fetch labor items' };
  }
};

/**
 * Get active labor items only
 */
export const getActiveLaborItems = async (
  userId: string
): Promise<LaborResponse<LaborItem[]>> => {
  try {
    const laborRef = collection(db, LABOR_COLLECTION);
    const q = query(
      laborRef,
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const laborItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LaborItem[];
    
    return { success: true, data: laborItems };
  } catch (error) {
    console.error('Error getting active labor items:', error);
    return { success: false, error: 'Failed to fetch active labor items' };
  }
};