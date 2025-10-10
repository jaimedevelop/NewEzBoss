// src/services/categories/management.ts
// Category management operations: update, delete, usage stats

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DatabaseResult, CategoryUsageStats, COLLECTIONS } from './types';

/**
 * Update category name at any level
 */
export const updateCategoryName = async (
  categoryId: string,
  newName: string,
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size',
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Validation
    if (!newName.trim()) {
      return { success: false, error: 'Name cannot be empty' };
    }

    if (newName.length > 30) {
      return { 
        success: false, 
        error: 'Name must be 30 characters or less' 
      };
    }

    // Map level to collection name
    const collectionMap = {
      trade: COLLECTIONS.PRODUCT_TRADES,
      section: COLLECTIONS.PRODUCT_SECTIONS,
      category: COLLECTIONS.PRODUCT_CATEGORIES,
      subcategory: COLLECTIONS.PRODUCT_SUBCATEGORIES,
      type: COLLECTIONS.PRODUCT_TYPES,
      size: COLLECTIONS.PRODUCT_SIZES
    };

    const collectionName = collectionMap[level];
    const categoryRef = doc(db, collectionName, categoryId);
    
    // Update the name
    await updateDoc(categoryRef, {
      name: newName.trim()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating category name:', error);
    return { success: false, error };
  }
};

/**
 * Get usage statistics for a category
 * Returns how many child categories and products would be affected by deletion
 */
export const getCategoryUsageStats = async (
  categoryId: string,
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size',
  userId: string
): Promise<DatabaseResult<CategoryUsageStats>> => {
  try {
    let categoryCount = 0;
    let productCount = 0;
    const affectedCategories: string[] = [];

    // Count descendants and products based on level
    if (level === 'trade') {
      // Get trade document for name
      const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, categoryId));
      if (!tradeDoc.exists()) {
        return { success: false, error: 'Trade not found' };
      }
      const tradeName = tradeDoc.data().name;

      // Count sections
      const sectionsQ = query(
        collection(db, COLLECTIONS.PRODUCT_SECTIONS),
        where('tradeId', '==', categoryId),
        where('userId', '==', userId)
      );
      const sectionsSnap = await getDocs(sectionsQ);
      categoryCount += sectionsSnap.size;
      
      // For each section, count categories
      for (const sectionDoc of sectionsSnap.docs) {
        const categoriesQ = query(
          collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
          where('sectionId', '==', sectionDoc.id),
          where('userId', '==', userId)
        );
        const categoriesSnap = await getDocs(categoriesQ);
        categoryCount += categoriesSnap.size;
        
        // For each category, count subcategories
        for (const categoryDoc of categoriesSnap.docs) {
          const subcategoriesQ = query(
            collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
            where('categoryId', '==', categoryDoc.id),
            where('userId', '==', userId)
          );
          const subcategoriesSnap = await getDocs(subcategoriesQ);
          categoryCount += subcategoriesSnap.size;
          
          // For each subcategory, count types
          for (const subcategoryDoc of subcategoriesSnap.docs) {
            const typesQ = query(
              collection(db, COLLECTIONS.PRODUCT_TYPES),
              where('subcategoryId', '==', subcategoryDoc.id),
              where('userId', '==', userId)
            );
            const typesSnap = await getDocs(typesQ);
            categoryCount += typesSnap.size;
          }
        }
      }
      
      // Count sizes (using trade NAME, not ID)
      const sizesQ = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('tradeId', '==', tradeName),  // ← Changed to use trade name
        where('userId', '==', userId)
      );
      const sizesSnap = await getDocs(sizesQ);
      categoryCount += sizesSnap.size;
      
      // Count products with this trade
      const productsQ = query(
        collection(db, 'products'),
        where('trade', '==', tradeName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productCount = productsSnap.size;
      
    } else if (level === 'section') {
      // Get section document for name
      const sectionDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SECTIONS, categoryId));
      if (!sectionDoc.exists()) {
        return { success: false, error: 'Section not found' };
      }
      const sectionName = sectionDoc.data().name;

      // Count categories
      const categoriesQ = query(
        collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
        where('sectionId', '==', categoryId),
        where('userId', '==', userId)
      );
      const categoriesSnap = await getDocs(categoriesQ);
      categoryCount += categoriesSnap.size;
      
      // For each category, count subcategories
      for (const categoryDoc of categoriesSnap.docs) {
        const subcategoriesQ = query(
          collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
          where('categoryId', '==', categoryDoc.id),
          where('userId', '==', userId)
        );
        const subcategoriesSnap = await getDocs(subcategoriesQ);
        categoryCount += subcategoriesSnap.size;
        
        // For each subcategory, count types
        for (const subcategoryDoc of subcategoriesSnap.docs) {
          const typesQ = query(
            collection(db, COLLECTIONS.PRODUCT_TYPES),
            where('subcategoryId', '==', subcategoryDoc.id),
            where('userId', '==', userId)
          );
          const typesSnap = await getDocs(typesQ);
          categoryCount += typesSnap.size;
        }
      }
      
      // Count products with this section
      const productsQ = query(
        collection(db, 'products'),
        where('section', '==', sectionName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productCount = productsSnap.size;
      
    } else if (level === 'category') {
      // Get category document for name
      const categoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_CATEGORIES, categoryId));
      if (!categoryDoc.exists()) {
        return { success: false, error: 'Category not found' };
      }
      const categoryName = categoryDoc.data().name;

      // Count subcategories
      const subcategoriesQ = query(
        collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
        where('categoryId', '==', categoryId),
        where('userId', '==', userId)
      );
      const subcategoriesSnap = await getDocs(subcategoriesQ);
      categoryCount += subcategoriesSnap.size;
      
      // For each subcategory, count types
      for (const subcategoryDoc of subcategoriesSnap.docs) {
        const typesQ = query(
          collection(db, COLLECTIONS.PRODUCT_TYPES),
          where('subcategoryId', '==', subcategoryDoc.id),
          where('userId', '==', userId)
        );
        const typesSnap = await getDocs(typesQ);
        categoryCount += typesSnap.size;
      }
      
      // Count products with this category
      const productsQ = query(
        collection(db, 'products'),
        where('category', '==', categoryName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productCount = productsSnap.size;
      
    } else if (level === 'subcategory') {
      // Get subcategory document for name
      const subcategoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SUBCATEGORIES, categoryId));
      if (!subcategoryDoc.exists()) {
        return { success: false, error: 'Subcategory not found' };
      }
      const subcategoryName = subcategoryDoc.data().name;

      // Count types
      const typesQ = query(
        collection(db, COLLECTIONS.PRODUCT_TYPES),
        where('subcategoryId', '==', categoryId),
        where('userId', '==', userId)
      );
      const typesSnap = await getDocs(typesQ);
      categoryCount = typesSnap.size;
      
      // Count products with this subcategory
      const productsQ = query(
        collection(db, 'products'),
        where('subcategory', '==', subcategoryName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productCount = productsSnap.size;
      
    } else if (level === 'type') {
      // Get type document for name
      const typeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TYPES, categoryId));
      if (!typeDoc.exists()) {
        return { success: false, error: 'Type not found' };
      }
      const typeName = typeDoc.data().name;

      // Count products with this type
      const productsQ = query(
        collection(db, 'products'),
        where('type', '==', typeName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productCount = productsSnap.size;
      
    } else if (level === 'size') {
      // Get size document for name
      const sizeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SIZES, categoryId));
      if (!sizeDoc.exists()) {
        return { success: false, error: 'Size not found' };
      }
      const sizeName = sizeDoc.data().name;

      // Count products with this size
      const productsQ = query(
        collection(db, 'products'),
        where('size', '==', sizeName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productCount = productsSnap.size;
    }

    return {
      success: true,
      data: {
        categoryCount,
        productCount,
        affectedCategories
      }
    };
  } catch (error) {
    console.error('Error getting category usage stats:', error);
    return { success: false, error };
  }
};

/**
 * Delete category and all its children recursively
 * Also deletes all products associated with this category
 */
export const deleteCategoryWithChildren = async (
  categoryId: string,
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size',
  userId: string
): Promise<DatabaseResult> => {
  try {
    const batch = writeBatch(db);

    if (level === 'trade') {
      // Get trade name for product deletion
      const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, categoryId));
      if (!tradeDoc.exists()) {
        return { success: false, error: 'Trade not found' };
      }
      const tradeName = tradeDoc.data().name;

      // Delete all sections and their descendants
      const sectionsQ = query(
        collection(db, COLLECTIONS.PRODUCT_SECTIONS),
        where('tradeId', '==', categoryId),
        where('userId', '==', userId)
      );
      const sectionsSnap = await getDocs(sectionsQ);
      
      for (const sectionDoc of sectionsSnap.docs) {
        // Delete categories under this section
        const categoriesQ = query(
          collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
          where('sectionId', '==', sectionDoc.id),
          where('userId', '==', userId)
        );
        const categoriesSnap = await getDocs(categoriesQ);
        
        for (const categoryDoc of categoriesSnap.docs) {
          // Delete subcategories under this category
          const subcategoriesQ = query(
            collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
            where('categoryId', '==', categoryDoc.id),
            where('userId', '==', userId)
          );
          const subcategoriesSnap = await getDocs(subcategoriesQ);
          
          for (const subcategoryDoc of subcategoriesSnap.docs) {
            // Delete types under this subcategory
            const typesQ = query(
              collection(db, COLLECTIONS.PRODUCT_TYPES),
              where('subcategoryId', '==', subcategoryDoc.id),
              where('userId', '==', userId)
            );
            const typesSnap = await getDocs(typesQ);
            typesSnap.docs.forEach(typeDoc => batch.delete(typeDoc.ref));
            
            batch.delete(subcategoryDoc.ref);
          }
          
          batch.delete(categoryDoc.ref);
        }
        
        batch.delete(sectionDoc.ref);
      }
      
      // Delete all sizes under this trade (using trade name)
      const sizesQ = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('tradeId', '==', tradeName),  // ← Changed to use trade name
        where('userId', '==', userId)
      );
      const sizesSnap = await getDocs(sizesQ);
      sizesSnap.docs.forEach(sizeDoc => batch.delete(sizeDoc.ref));
      
      // Delete all products with this trade
      const productsQ = query(
        collection(db, 'products'),
        where('trade', '==', tradeName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      
      // Delete the trade itself
      batch.delete(doc(db, COLLECTIONS.PRODUCT_TRADES, categoryId));
      
    } else if (level === 'section') {
      // Similar pattern for section level...
      const sectionDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SECTIONS, categoryId));
      if (!sectionDoc.exists()) {
        return { success: false, error: 'Section not found' };
      }
      const sectionName = sectionDoc.data().name;

      // Delete categories and their descendants
      const categoriesQ = query(
        collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
        where('sectionId', '==', categoryId),
        where('userId', '==', userId)
      );
      const categoriesSnap = await getDocs(categoriesQ);
      
      for (const categoryDoc of categoriesSnap.docs) {
        const subcategoriesQ = query(
          collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
          where('categoryId', '==', categoryDoc.id),
          where('userId', '==', userId)
        );
        const subcategoriesSnap = await getDocs(subcategoriesQ);
        
        for (const subcategoryDoc of subcategoriesSnap.docs) {
          const typesQ = query(
            collection(db, COLLECTIONS.PRODUCT_TYPES),
            where('subcategoryId', '==', subcategoryDoc.id),
            where('userId', '==', userId)
          );
          const typesSnap = await getDocs(typesQ);
          typesSnap.docs.forEach(typeDoc => batch.delete(typeDoc.ref));
          
          batch.delete(subcategoryDoc.ref);
        }
        
        batch.delete(categoryDoc.ref);
      }
      
      // Delete products with this section
      const productsQ = query(
        collection(db, 'products'),
        where('section', '==', sectionName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_SECTIONS, categoryId));
      
    } else if (level === 'category') {
      const categoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_CATEGORIES, categoryId));
      if (!categoryDoc.exists()) {
        return { success: false, error: 'Category not found' };
      }
      const categoryName = categoryDoc.data().name;

      // Delete subcategories and types
      const subcategoriesQ = query(
        collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
        where('categoryId', '==', categoryId),
        where('userId', '==', userId)
      );
      const subcategoriesSnap = await getDocs(subcategoriesQ);
      
      for (const subcategoryDoc of subcategoriesSnap.docs) {
        const typesQ = query(
          collection(db, COLLECTIONS.PRODUCT_TYPES),
          where('subcategoryId', '==', subcategoryDoc.id),
          where('userId', '==', userId)
        );
        const typesSnap = await getDocs(typesQ);
        typesSnap.docs.forEach(typeDoc => batch.delete(typeDoc.ref));
        
        batch.delete(subcategoryDoc.ref);
      }
      
      // Delete products
      const productsQ = query(
        collection(db, 'products'),
        where('category', '==', categoryName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_CATEGORIES, categoryId));
      
    } else if (level === 'subcategory') {
      const subcategoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SUBCATEGORIES, categoryId));
      if (!subcategoryDoc.exists()) {
        return { success: false, error: 'Subcategory not found' };
      }
      const subcategoryName = subcategoryDoc.data().name;

      // Delete types
      const typesQ = query(
        collection(db, COLLECTIONS.PRODUCT_TYPES),
        where('subcategoryId', '==', categoryId),
        where('userId', '==', userId)
      );
      const typesSnap = await getDocs(typesQ);
      typesSnap.docs.forEach(typeDoc => batch.delete(typeDoc.ref));
      
      // Delete products
      const productsQ = query(
        collection(db, 'products'),
        where('subcategory', '==', subcategoryName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_SUBCATEGORIES, categoryId));
      
    } else if (level === 'type') {
      const typeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TYPES, categoryId));
      if (!typeDoc.exists()) {
        return { success: false, error: 'Type not found' };
      }
      const typeName = typeDoc.data().name;

      // Delete products
      const productsQ = query(
        collection(db, 'products'),
        where('type', '==', typeName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_TYPES, categoryId));
      
    } else if (level === 'size') {
      const sizeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SIZES, categoryId));
      if (!sizeDoc.exists()) {
        return { success: false, error: 'Size not found' };
      }
      const sizeName = sizeDoc.data().name;

      // Delete products (note: sizes are stored by name in products too)
      const productsQ = query(
        collection(db, 'products'),
        where('size', '==', sizeName),
        where('userId', '==', userId)
      );
      const productsSnap = await getDocs(productsQ);
      productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_SIZES, categoryId));
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error deleting category with children:', error);
    return { success: false, error };
  }
};