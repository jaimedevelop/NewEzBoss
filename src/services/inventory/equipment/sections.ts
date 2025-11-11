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
import { EquipmentResponse, EquipmentSection } from './equipment.types';
import { hierarchyCache } from '../../../utils/hierarchyCache';

const EQUIPMENT_SECTIONS_COLLECTION = 'equipmentSections';

export const getEquipmentSections = async (
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<EquipmentSection[]>> => {
  try {
    const cached = hierarchyCache.getSections('equipment', tradeId, userId);
    if (cached) {
      console.log('✅ Equipment sections loaded from cache');
      return { success: true, data: cached };
    }

    const q = query(
      collection(db, EQUIPMENT_SECTIONS_COLLECTION),
      where('userId', '==', userId),
      where('tradeId', '==', tradeId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections: EquipmentSection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EquipmentSection[];

    hierarchyCache.setSections('equipment', tradeId, userId, sections);
    console.log('✅ Equipment sections loaded from Firebase and cached');

    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting equipment sections:', error);
    return { success: false, error: 'Failed to fetch equipment sections' };
  }
};

export const addEquipmentSection = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Section name must be 30 characters or less' 
      };
    }

    const existingResult = await getEquipmentSections(tradeId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        section => section.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A section with this name already exists for this trade' 
        };
      }
    }

    const sectionRef = await addDoc(
      collection(db, EQUIPMENT_SECTIONS_COLLECTION),
      {
        name: name.trim(),
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    hierarchyCache.clearSectionsForTrade('equipment', tradeId, userId);

    return { success: true, data: sectionRef.id };
  } catch (error) {
    console.error('Error adding equipment section:', error);
    return { success: false, error: 'Failed to add equipment section' };
  }
};

export const updateEquipmentSectionName = async (
  sectionId: string,
  newName: string,
  userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    const sectionRef = doc(db, EQUIPMENT_SECTIONS_COLLECTION, sectionId);
    
    const sectionDoc = await getDocs(query(
      collection(db, EQUIPMENT_SECTIONS_COLLECTION),
      where('__name__', '==', sectionId)
    ));
    
    if (!sectionDoc.empty) {
      const sectionData = sectionDoc.docs[0].data();
      const tradeId = sectionData.tradeId;
      
      await updateDoc(sectionRef, { name: newName });
      hierarchyCache.clearSectionsForTrade('equipment', tradeId, userId);
    } else {
      await updateDoc(sectionRef, { name: newName });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating equipment section:', error);
    return { success: false, error: 'Failed to update equipment section' };
  }
};

export const deleteEquipmentSectionWithChildren = async (
  sectionId: string,
  userId: string
): Promise<EquipmentResponse<void>> => {
  try {
    const batch = writeBatch(db);

    const sectionDoc = await getDocs(query(
      collection(db, EQUIPMENT_SECTIONS_COLLECTION),
      where('__name__', '==', sectionId)
    ));
    
    let tradeId: string | null = null;
    if (!sectionDoc.empty) {
      tradeId = sectionDoc.docs[0].data().tradeId;
    }

    const categoriesQuery = query(
      collection(db, 'equipmentCategories'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    
    const categoryIds: string[] = [];
    categoriesSnapshot.docs.forEach(doc => {
      categoryIds.push(doc.id);
      batch.delete(doc.ref);
    });

    for (const categoryId of categoryIds) {
      const subcategoriesQuery = query(
        collection(db, 'equipmentSubcategories'),
        where('userId', '==', userId),
        where('categoryId', '==', categoryId)
      );
      const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
      subcategoriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    const equipmentItemsQuery = query(
      collection(db, 'equipment_items'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const equipmentItemsSnapshot = await getDocs(equipmentItemsQuery);
    equipmentItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    const sectionRef = doc(db, EQUIPMENT_SECTIONS_COLLECTION, sectionId);
    batch.delete(sectionRef);

    await batch.commit();

    if (tradeId) {
      hierarchyCache.clearSectionsForTrade('equipment', tradeId, userId);
    }
    hierarchyCache.clearCategoriesForSection('equipment', sectionId, userId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment section:', error);
    return { success: false, error: 'Failed to delete equipment section' };
  }
};

export const getEquipmentSectionUsageStats = async (
  sectionId: string,
  userId: string
): Promise<EquipmentResponse<{ categoryCount: number; itemCount: number }>> => {
  try {
    const categoriesQuery = query(
      collection(db, 'equipmentCategories'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    const categoryCount = categoriesSnapshot.size;

    const itemsQuery = query(
      collection(db, 'equipment_items'),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    const itemCount = itemsSnapshot.size;

    return {
      success: true,
      data: { categoryCount, itemCount }
    };
  } catch (error) {
    console.error('Error getting equipment section usage stats:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};