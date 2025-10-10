// src/services/categories/hierarchy.ts
// Full category hierarchy operations

import {
  collection,
  getDocs,
  query,
  where,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  DatabaseResult,
  CategoryNode,
  ProductTrade,
  ProductSection,
  ProductCategory,
  ProductSubcategory,
  ProductType,
  ProductSize,
  COLLECTIONS
} from './types';
import { getProductTrades } from './trades';

/**
 * Helper function to get all sections for a user
 */
const getAllSections = async (
  userId: string
): Promise<DatabaseResult<ProductSection[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      where('userId', '==', userId)
    );
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSection[];
    return { success: true, data: sections };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Helper function to get all categories for a user
 */
const getAllCategories = async (
  userId: string
): Promise<DatabaseResult<ProductCategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
      where('userId', '==', userId)
    );
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const categories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductCategory[];
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Helper function to get all subcategories for a user
 */
const getAllSubcategories = async (
  userId: string
): Promise<DatabaseResult<ProductSubcategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
      where('userId', '==', userId)
    );
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const subcategories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSubcategory[];
    return { success: true, data: subcategories };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Helper function to get all types for a user
 */
const getAllTypes = async (
  userId: string
): Promise<DatabaseResult<ProductType[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_TYPES),
      where('userId', '==', userId)
    );
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const types = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductType[];
    return { success: true, data: types };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Helper function to get all sizes for a user
 */
const getAllSizes = async (
  userId: string
): Promise<DatabaseResult<ProductSize[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SIZES),
      where('userId', '==', userId)
    );
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sizes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSize[];
    return { success: true, data: sizes };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Get full category hierarchy for a user
 * Builds a tree structure: Trade -> Section -> Category -> Subcategory -> Type
 * and Trade -> Size (separate branch)
 */
export const getFullCategoryHierarchy = async (
  userId: string
): Promise<DatabaseResult<CategoryNode[]>> => {
  try {
    // Fetch all levels in parallel
    const [
      tradesRes,
      sectionsRes,
      categoriesRes,
      subcategoriesRes,
      typesRes,
      sizesRes
    ] = await Promise.all([
      getProductTrades(userId),
      getAllSections(userId),
      getAllCategories(userId),
      getAllSubcategories(userId),
      getAllTypes(userId),
      getAllSizes(userId)
    ]);

    const trades = tradesRes.data || [];
    const sections = sectionsRes.data || [];
    const categories = categoriesRes.data || [];
    const subcategories = subcategoriesRes.data || [];
    const types = typesRes.data || [];
    const sizes = sizesRes.data || [];

    // Build tree structure starting from trades
    const tradeNodes: CategoryNode[] = trades.map(trade => ({
      id: trade.id!,
      name: trade.name,
      level: 'trade' as const,
      children: [],
      productCount: 0,
      descendantCount: 0
    }));

    // Add sections to trades
    tradeNodes.forEach(tradeNode => {
      const tradeSections = sections.filter(s => s.tradeId === tradeNode.id);
      
      tradeNode.children = tradeSections.map(section => ({
        id: section.id!,
        name: section.name,
        level: 'section' as const,
        parentId: tradeNode.id,
        children: [],
        productCount: 0,
        descendantCount: 0
      }));

      // Add sizes as separate branch under trade
      const tradeSizes = sizes.filter(s => s.tradeId === tradeNode.id);
      const sizesNodes: CategoryNode[] = tradeSizes.map(size => ({
        id: size.id!,
        name: size.name,
        level: 'size' as const,
        parentId: tradeNode.id,
        children: [],
        productCount: 0,
        descendantCount: 0
      }));
      
      tradeNode.children.push(...sizesNodes);
    });

    // Add categories to sections
    tradeNodes.forEach(tradeNode => {
      tradeNode.children
        .filter(n => n.level === 'section')
        .forEach(sectionNode => {
          const sectionCategories = categories.filter(
            c => c.sectionId === sectionNode.id
          );
          
          sectionNode.children = sectionCategories.map(category => ({
            id: category.id!,
            name: category.name,
            level: 'category' as const,
            parentId: sectionNode.id,
            children: [],
            productCount: 0,
            descendantCount: 0
          }));
        });
    });

    // Add subcategories to categories
    tradeNodes.forEach(tradeNode => {
      tradeNode.children
        .filter(n => n.level === 'section')
        .forEach(sectionNode => {
          sectionNode.children.forEach(categoryNode => {
            const categorySubcategories = subcategories.filter(
              s => s.categoryId === categoryNode.id
            );
            
            categoryNode.children = categorySubcategories.map(subcategory => ({
              id: subcategory.id!,
              name: subcategory.name,
              level: 'subcategory' as const,
              parentId: categoryNode.id,
              children: [],
              productCount: 0,
              descendantCount: 0
            }));
          });
        });
    });

    // Add types to subcategories
    tradeNodes.forEach(tradeNode => {
      tradeNode.children
        .filter(n => n.level === 'section')
        .forEach(sectionNode => {
          sectionNode.children.forEach(categoryNode => {
            categoryNode.children.forEach(subcategoryNode => {
              const subcategoryTypes = types.filter(
                t => t.subcategoryId === subcategoryNode.id
              );
              
              subcategoryNode.children = subcategoryTypes.map(type => ({
                id: type.id!,
                name: type.name,
                level: 'type' as const,
                parentId: subcategoryNode.id,
                children: [],
                productCount: 0,
                descendantCount: 0
              }));
            });
          });
        });
    });

    return { success: true, data: tradeNodes };
  } catch (error) {
    console.error('Error getting full category hierarchy:', error);
    return { success: false, error };
  }
};