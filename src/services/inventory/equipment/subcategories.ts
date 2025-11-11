import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { EquipmentResponse, EquipmentSubcategory } from './equipment.types';
import { hierarchyCache } from '../../../utils/hierarchyCache';

const EQUIPMENT_SUBCATEGORIES_COLLECTION = 'equipmentSubcategories';

export const getEquipmentSubcategories = async (
  categoryId: string,
  userId: string
): Promise<EquipmentResponse<EquipmentSubcategory[]>> => {
  try {
    const cached = hierarchyCache.getSubcategories('equipment', categoryId, userId);
    if (cached) {
      console.log('✅ Equipment subcategories loaded from cache');
      return { success: true, data: cached };
    }

    const q = query(
      collection(db, EQUIPMENT_SUBCATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const subcategories: EquipmentSubcategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentSubcategory[];

    hierarchyCache.setSubcategories('equipment', categoryId, userId, subcategories);
    console.log('✅ Equipment subcategories loaded from Firebase and cached');

    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting equipment subcategories:', error);
    return { success: false, error: 'Failed to fetch equipment subcategories' };
  }
};

export const addEquipmentSubcategory = async (
  name: string,
  categoryId: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Subcategory name must be 30 characters or less' 
      };
    }

    const existingResult = await getEquipmentSubcategories(categoryId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        subcategory => subcategory.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A subcategory with this name already exists for this category' 
        };
      }
    }

    const subcategoryRef = await addDoc(
      collection(db, EQUIPMENT_SUBCATEGORIES_COLLECTION),
      {
        name: name.trim(),
        categoryId,
        sectionId,
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    hierarchyCache.clearSubcategoriesForCategory('equipment', categoryId, userId);

    return { success: true, data: subcategoryRef.id };
  } catch (error) {
    console.error('Error adding equipment subcategory:', error);
    return { success: false, error: 'Failed to add equipment subcategory' };
  }
};

export const updateEquipmentSubcategoryName = async (
  subcategoryId: string,
  newName: string,
  userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    const subcategoryRef = doc(db, EQUIPMENT_SUBCATEGORIES_COLLECTION, subcategoryId);
    
    const subcategoryDoc = await getDocs(query(
      collection(db, EQUIPMENT_SUBCATEGORIES_COLLECTION),
      where('__name__', '==', subcategoryId)
    ));
    
    if (!subcategoryDoc.empty) {
      const subcategoryData = subcategoryDoc.docs[0].data();
      const categoryId = subcategoryData.categoryId;
      
      await updateDoc(subcategoryRef, { name: newName });
      hierarchyCache.clearSubcategoriesForCategory('equipment', categoryId, userId);
    } else {
      await updateDoc(subcategoryRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating equipment subcategory:', error);
    return { success: false, error: 'Failed to update equipment subcategory' };
  }
};

export const deleteEquipmentSubcategoryWithChildren = async (
  subcategoryId: string,
  userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    const batch = writeBatch(db);

    const subcategoryDoc = await getDocs(query(
      collection(db, EQUIPMENT_SUBCATEGORIES_COLLECTION),
      where('__name__', '==', subcategoryId)
    ));
    
    let categoryId: string | null = null;
    if (!subcategoryDoc.empty) {
      categoryId = subcategoryDoc.docs[0].data().categoryId;
    }

    const equipmentItemsQuery = query(
      collection(db, 'equipment_items'),
      where('userId', '==', userId),
      where('subcategoryId', '==', subcategoryId)
    );
    const equipmentItemsSnapshot = await getDocs(equipmentItemsQuery);
    equipmentItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    const subcategoryRef = doc(db, EQUIPMENT_SUBCATEGORIES_COLLECTION, subcategoryId);
    batch.delete(subcategoryRef);

    await batch.commit();

    if (categoryId) {
      hierarchyCache.clearSubcategoriesForCategory('equipment', categoryId, userId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment subcategory:', error);
    return { success: false, error: 'Failed to delete equipment subcategory' };
  }
};

export const getEquipmentSubcategoryUsageStats = async (
  subcategoryId: string,
  userId: string
): Promise<EquipmentResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const categoryCount = 0;

    const itemsQuery = query(
      collection(db, 'equipment_items'),
      where('userId', '==', userId),
      where('subcategoryId', '==', subcategoryId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    const itemCount = itemsSnapshot.size;

    return {
      success: true,
      data: { categoryCount, itemCount }
    };
  } catch (error) {
    console.error('Error getting equipment subcategory usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};