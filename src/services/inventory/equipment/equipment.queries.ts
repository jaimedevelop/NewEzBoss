// src/services/inventory/equipment/equipment.queries.ts

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
  EquipmentItem, 
  EquipmentFilters, 
  EquipmentResponse, 
  PaginatedEquipmentResponse 
} from './equipment.types';

const EQUIPMENT_COLLECTION = 'equipment_items';

/**
 * Get a single equipment item by ID
 */
export const getEquipmentItem = async (
  equipmentId: string
): Promise<EquipmentResponse<EquipmentItem>> => {
  try {
    const equipmentRef = doc(db, EQUIPMENT_COLLECTION, equipmentId);
    const equipmentDoc = await getDoc(equipmentRef);
    
    if (!equipmentDoc.exists()) {
      return { success: false, error: 'Equipment not found' };
    }
    
    return {
      success: true,
      data: { id: equipmentDoc.id, ...equipmentDoc.data() } as EquipmentItem
    };
  } catch (error) {
    console.error('Error getting equipment:', error);
    return { success: false, error: 'Failed to fetch equipment' };
  }
};

/**
 * Get all equipment with optional filters and pagination
 */
export const getEquipment = async (
  userId: string,
  filters?: EquipmentFilters,
  pageSize: number = 999,
  lastDoc?: any
): Promise<EquipmentResponse<PaginatedEquipmentResponse>> => {
  try {
    const equipmentRef = collection(db, EQUIPMENT_COLLECTION);
    let q = query(
      equipmentRef,
      where('userId', '==', userId),
      orderBy(filters?.sortBy || 'name', filters?.sortOrder || 'asc'),
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
    
    if (filters?.subcategoryId) {
      q = query(q, where('subcategoryId', '==', filters.subcategoryId));
    }
    
    if (filters?.equipmentType) {
      q = query(q, where('equipmentType', '==', filters.equipmentType));
    }
    
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    // Apply pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    let equipment = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentItem[];
    
    // Apply search filter (client-side)
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      equipment = equipment.filter(item => {
        // Search in basic fields
        const basicMatch = 
          item.name.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.notes?.toLowerCase().includes(searchLower) ||
          item.tradeName?.toLowerCase().includes(searchLower) ||
          item.sectionName?.toLowerCase().includes(searchLower) ||
          item.categoryName?.toLowerCase().includes(searchLower) ||
          item.subcategoryName?.toLowerCase().includes(searchLower);
        
        // Search in rental entries
        const rentalMatch = item.rentalEntries?.some(entry => 
          entry.storeName.toLowerCase().includes(searchLower) ||
          entry.storeLocation?.toLowerCase().includes(searchLower)
        );
        
        return basicMatch || rentalMatch;
      });
    }
    
    // Check if there are more results
    const hasMore = equipment.length > pageSize;
    if (hasMore) {
      equipment = equipment.slice(0, pageSize);
    }
    
    return {
      success: true,
      data: {
        equipment,
        hasMore,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      }
    };
  } catch (error) {
    console.error('Error getting equipment:', error);
    return { success: false, error: 'Failed to fetch equipment' };
  }
};

/**
 * Get equipment by trade
 */
export const getEquipmentByTrade = async (
  userId: string,
  tradeId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  try {
    const equipmentRef = collection(db, EQUIPMENT_COLLECTION);
    const q = query(
      equipmentRef,
      where('userId', '==', userId),
      where('tradeId', '==', tradeId),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const equipment = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentItem[];
    
    return { success: true, data: equipment };
  } catch (error) {
    console.error('Error getting equipment by trade:', error);
    return { success: false, error: 'Failed to fetch equipment' };
  }
};

/**
 * Get available equipment only
 */
export const getAvailableEquipment = async (
  userId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  try {
    const equipmentRef = collection(db, EQUIPMENT_COLLECTION);
    const q = query(
      equipmentRef,
      where('userId', '==', userId),
      where('status', '==', 'available'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const equipment = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentItem[];
    
    return { success: true, data: equipment };
  } catch (error) {
    console.error('Error getting available equipment:', error);
    return { success: false, error: 'Failed to fetch available equipment' };
  }
};

/**
 * Get rented equipment (from rental stores)
 */
export const getRentedEquipment = async (
  userId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  try {
    const equipmentRef = collection(db, EQUIPMENT_COLLECTION);
    const q = query(
      equipmentRef,
      where('userId', '==', userId),
      where('equipmentType', '==', 'rented'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const equipment = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentItem[];
    
    return { success: true, data: equipment };
  } catch (error) {
    console.error('Error getting rented equipment:', error);
    return { success: false, error: 'Failed to fetch rented equipment' };
  }
};

/**
 * Get owned equipment
 */
export const getOwnedEquipment = async (
  userId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  try {
    const equipmentRef = collection(db, EQUIPMENT_COLLECTION);
    const q = query(
      equipmentRef,
      where('userId', '==', userId),
      where('equipmentType', '==', 'owned'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const equipment = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentItem[];
    
    return { success: true, data: equipment };
  } catch (error) {
    console.error('Error getting owned equipment:', error);
    return { success: false, error: 'Failed to fetch owned equipment' };
  }
};