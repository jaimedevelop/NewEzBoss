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
import { EquipmentResponse, EquipmentCategory } from './equipment.types';
import { hierarchyCache } from '../../../utils/hierarchyCache';

const EQUIPMENT_CATEGORIES_COLLECTION = 'equipmentCategories';

export const getEquipmentCategories = async (
  sectionId: string,
  userId: string
): Promise<EquipmentResponse<EquipmentCategory[]>> => {
  try {
    const cached = hierarchyCache.getCategories('equipment', sectionId, userId);
    if (cached) {
      console.log('✅ Equipment categories loaded from cache');
      return { success: true, data: cached };
    }

    const q = query(
      collection(db, EQUIPMENT_CATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const categories: EquipmentCategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentCategory[];

    hierarchyCache.setCategories('equipment', sectionId, userId, categories);
    console.log('✅ Equipment categories loaded from Firebase and cached');

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting equipment categories:', error);
    return { success: false, error: 'Failed to fetch equipment categories' };
  }
};

export const addEquipmentCategory = async (
  name: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Category name must be 30 characters or less' 
      };
    }

    const existingResult = await getEquipmentCategories(sectionId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        category => category.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A category with this name already exists for this section' 
        };
      }
    }

    const categoryRef = await addDoc(
      collection(db, EQUIPMENT_CATEGORIES_COLLECTION),
      {
        name: name.trim(),
        sectionId,
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    hierarchyCache.clearCategoriesForSection('equipment', sectionId, userId);

    return { success: true, data: categoryRef.id };
  } catch (error) {
    console.error('Error adding equipment category:', error);
    return { success: false, error: 'Failed to add equipment category' };
  }
};

export const updateEquipmentCategoryName = async (
  categoryId: string,
  newName: string,
  userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    const categoryRef = doc(db, EQUIPMENT_CATEGORIES_COLLECTION, categoryId);
    
    const categoryDoc = await getDocs(query(
      collection(db, EQUIPMENT_CATEGORIES_COLLECTION),
      where('__name__', '==', categoryId)
    ));
    
    if (!categoryDoc.empty) {
      const categoryData = categoryDoc.docs[0].data();
      const sectionId = categoryData.sectionId;
      
      await updateDoc(categoryRef, { name: newName });
      hierarchyCache.clearCategoriesForSection('equipment', sectionId, userId);
    } else {
      await updateDoc(categoryRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating equipment category:', error);
    return { success: false, error: 'Failed to update equipment category' };
  }
};

export const deleteEquipmentCategoryWithChildren = async (
  categoryId: string,
  userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    const batch = writeBatch(db);

    const categoryDoc = await getDocs(query(
      collection(db, EQUIPMENT_CATEGORIES_COLLECTION),
      where('__name__', '==', categoryId)
    ));
    
    let sectionId: string | null = null;
    if (!categoryDoc.empty) {
      sectionId = categoryDoc.docs[0].data().sectionId;
    }

    const subcategoriesQuery = query(
      collection(db, 'equipmentSubcategories'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
    subcategoriesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    const equipmentItemsQuery = query(
      collection(db, 'equipment_items'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const equipmentItemsSnapshot = await getDocs(equipmentItemsQuery);
    equipmentItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    const categoryRef = doc(db, EQUIPMENT_CATEGORIES_COLLECTION, categoryId);
    batch.delete(categoryRef);

    await batch.commit();

    if (sectionId) {
      hierarchyCache.clearCategoriesForSection('equipment', sectionId, userId);
    }
    hierarchyCache.clearSubcategoriesForCategory('equipment', categoryId, userId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment category:', error);
    return { success: false, error: 'Failed to delete equipment category' };
  }
};

export const getEquipmentCategoryUsageStats = async (
  categoryId: string,
  userId: string
): Promise<EquipmentResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const subcategoriesQuery = query(
      collection(db, 'equipmentSubcategories'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
    const categoryCount = subcategoriesSnapshot.size;

    const itemsQuery = query(
      collection(db, 'equipment_items'),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    const itemCount = itemsSnapshot.size;

    return {
      success: true,
      data: { categoryCount, itemCount }
    };
  } catch (error) {
    console.error('Error getting equipment category usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};