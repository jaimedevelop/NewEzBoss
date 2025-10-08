// src/services/productCategories.ts

import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentSnapshot,
  QuerySnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Database result interface
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

// Interfaces for hierarchical categories - NEW HIERARCHY: Trade -> Section -> Category -> Subcategory -> Type
export interface ProductTrade {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

export interface ProductSection {
  id?: string;
  name: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductCategory {
  id?: string;
  name: string;
  sectionId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductSubcategory {
  id?: string;
  name: string;
  categoryId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductType {
  id?: string;
  name: string;
  subcategoryId: string;
  userId: string;
  createdAt?: any;
}

export interface ProductSize {
  id?: string;
  name: string;
  tradeId: string; // Changed from sectionId to tradeId
  userId: string;
  createdAt?: any;
}

// Standalone product type interface
export interface StandaloneProductType {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

const COLLECTIONS = {
  PRODUCT_TRADES: 'productTrades', // NEW
  PRODUCT_SECTIONS: 'productSections', // Modified to be under trades
  PRODUCT_CATEGORIES: 'productCategories', 
  PRODUCT_SUBCATEGORIES: 'productSubcategories',
  PRODUCT_TYPES: 'productTypes',
  PRODUCT_SIZES: 'productSizes',
  STANDALONE_PRODUCT_TYPES: 'standaloneProductTypes'
};

// === TRADE OPERATIONS (NEW TOP LEVEL) ===
export const addProductTrade = async (name: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates (case-insensitive)
    const existingResult = await getProductTrades(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(trade => 
        trade.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A trade with this name already exists' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Trade name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Trade name cannot be empty' };
    }

    const tradeRef = await addDoc(collection(db, COLLECTIONS.PRODUCT_TRADES), {
      name: name.trim(),
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: tradeRef.id };
  } catch (error) {
    console.error('Error adding product trade:', error);
    return { success: false, error };
  }
};

export const getProductTrades = async (userId: string): Promise<DatabaseResult<ProductTrade[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_TRADES),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const trades: ProductTrade[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductTrade[];

    return { success: true, data: trades };
  } catch (error) {
    console.error('Error getting product trades:', error);
    return { success: false, error };
  }
};

export const getAllAvailableTrades = async (userId: string): Promise<DatabaseResult<string[]>> => {
  try {
    const tradesResult = await getProductTrades(userId);
    const trades = tradesResult.success ? tradesResult.data || [] : [];
    
    const tradeNames = trades.map(trade => trade.name).sort();
    
    return { success: true, data: tradeNames };
  } catch (error) {
    console.error('Error getting all available trades:', error);
    return { success: false, error };
  }
};

// === SECTION OPERATIONS (NOW UNDER TRADES) ===
export const addProductSection = async (name: string, tradeId: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates in this trade
    const existingResult = await getProductSections(tradeId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(section => 
        section.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A section with this name already exists in this trade' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Section name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }

    const sectionRef = await addDoc(collection(db, COLLECTIONS.PRODUCT_SECTIONS), {
      name: name.trim(),
      tradeId,
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: sectionRef.id };
  } catch (error) {
    console.error('Error adding product section:', error);
    return { success: false, error };
  }
};

export const getProductSections = async (tradeId: string, userId: string): Promise<DatabaseResult<ProductSection[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      where('tradeId', '==', tradeId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections: ProductSection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSection[];

    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting product sections:', error);
    return { success: false, error };
  }
};

export const getAllAvailableSections = async (userId: string): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections = querySnapshot.docs.map(doc => doc.data().name as string);
    
    // Remove duplicates and sort
    const uniqueSections = Array.from(new Set(sections)).sort();
    
    return { success: true, data: uniqueSections };
  } catch (error) {
    console.error('Error getting all available sections:', error);
    return { success: false, error };
  }
};

// === SIZE OPERATIONS (NOW UNDER TRADES) ===
export const addProductSize = async (name: string, tradeId: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates in this trade
    const existingResult = await getProductSizes(tradeId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(size => 
        size.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A size with this name already exists in this trade' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Size name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Size name cannot be empty' };
    }

    const sizeRef = await addDoc(collection(db, COLLECTIONS.PRODUCT_SIZES), {
      name: name.trim(),
      tradeId,
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: sizeRef.id };
  } catch (error) {
    console.error('Error adding product size:', error);
    return { success: false, error };
  }
};

export const getProductSizes = async (tradeId: string, userId: string): Promise<DatabaseResult<ProductSize[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SIZES),
      where('tradeId', '==', tradeId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sizes: ProductSize[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSize[];

    return { success: true, data: sizes };
  } catch (error) {
    console.error('Error getting product sizes:', error);
    return { success: false, error };
  }
};

// === CATEGORY OPERATIONS (NOW UNDER SECTIONS) ===
export const addProductCategory = async (name: string, sectionId: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates in this section
    const existingResult = await getProductCategories(sectionId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(category => 
        category.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A category with this name already exists in this section' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Category name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }

    const categoryRef = await addDoc(collection(db, COLLECTIONS.PRODUCT_CATEGORIES), {
      name: name.trim(),
      sectionId,
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: categoryRef.id };
  } catch (error) {
    console.error('Error adding product category:', error);
    return { success: false, error };
  }
};

export const getProductCategories = async (sectionId: string, userId: string): Promise<DatabaseResult<ProductCategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
      where('sectionId', '==', sectionId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const categories: ProductCategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductCategory[];

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting product categories:', error);
    return { success: false, error };
  }
};

// === SUBCATEGORY OPERATIONS ===
export const addProductSubcategory = async (name: string, categoryId: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates in this category
    const existingResult = await getProductSubcategories(categoryId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(subcategory => 
        subcategory.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A subcategory with this name already exists in this category' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Subcategory name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }

    const subcategoryRef = await addDoc(collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES), {
      name: name.trim(),
      categoryId,
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: subcategoryRef.id };
  } catch (error) {
    console.error('Error adding product subcategory:', error);
    return { success: false, error };
  }
};

export const getProductSubcategories = async (categoryId: string, userId: string): Promise<DatabaseResult<ProductSubcategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
      where('categoryId', '==', categoryId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const subcategories: ProductSubcategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSubcategory[];

    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting product subcategories:', error);
    return { success: false, error };
  }
};

// === TYPE OPERATIONS ===
export const addProductType = async (name: string, subcategoryId: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates in this subcategory
    const existingResult = await getProductTypes(subcategoryId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(type => 
        type.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A type with this name already exists in this subcategory' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Type name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Type name cannot be empty' };
    }

    const typeRef = await addDoc(collection(db, COLLECTIONS.PRODUCT_TYPES), {
      name: name.trim(),
      subcategoryId,
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: typeRef.id };
  } catch (error) {
    console.error('Error adding product type:', error);
    return { success: false, error };
  }
};

export const getProductTypes = async (subcategoryId: string, userId: string): Promise<DatabaseResult<ProductType[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_TYPES),
      where('subcategoryId', '==', subcategoryId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const types: ProductType[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductType[];

    return { success: true, data: types };
  } catch (error) {
    console.error('Error getting product types:', error);
    return { success: false, error };
  }
};

// === STANDALONE PRODUCT TYPE OPERATIONS ===
// These are for the main "Product Type" field that's independent of the hierarchy

export const addStandaloneProductType = async (name: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates (case-insensitive)
    const existingResult = await getStandaloneProductTypes(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(type => 
        type.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A product type with this name already exists' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Product type name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Product type name cannot be empty' };
    }

    const typeRef = await addDoc(collection(db, COLLECTIONS.STANDALONE_PRODUCT_TYPES), {
      name: name.trim(),
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: typeRef.id };
  } catch (error) {
    console.error('Error adding standalone product type:', error);
    return { success: false, error };
  }
};

export const getStandaloneProductTypes = async (userId: string): Promise<DatabaseResult<StandaloneProductType[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.STANDALONE_PRODUCT_TYPES),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const userTypes: StandaloneProductType[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StandaloneProductType[];

    return { success: true, data: userTypes };
  } catch (error) {
    console.error('Error getting standalone product types:', error);
    return { success: false, error };
  }
};

export const getAllAvailableProductTypes = async (userId: string): Promise<DatabaseResult<string[]>> => {
  try {
    const userTypesResult = await getStandaloneProductTypes(userId);
    const userTypes = userTypesResult.success ? userTypesResult.data || [] : [];
    
    const typeNames = userTypes.map(type => type.name).sort();
    
    return { success: true, data: typeNames };
  } catch (error) {
    console.error('Error getting all available product types:', error);
    return { success: false, error };
  }
};
// === CATEGORY HIERARCHY AND MANAGEMENT ===

export interface CategoryNode {
  id: string;
  name: string;
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size';
  parentId?: string;
  children: CategoryNode[];
  productCount: number;
  descendantCount: number;
}

export interface CategoryUsageStats {
  categoryCount: number;
  productCount: number;
  affectedCategories: string[];
}

/**
 * Get full category hierarchy for a user
 */
export const getFullCategoryHierarchy = async (userId: string): Promise<DatabaseResult<CategoryNode[]>> => {
  try {
    console.log('🔍 Starting getFullCategoryHierarchy for userId:', userId);
    
    // Fetch all category levels
    const [tradesRes, sectionsRes, categoriesRes, subcategoriesRes, typesRes, sizesRes] = await Promise.all([
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

    console.log('📊 Fetched data counts:', {
      trades: trades.length,
      sections: sections.length,
      categories: categories.length,
      subcategories: subcategories.length,
      types: types.length,
      sizes: sizes.length
    });

    // Log sample records to verify structure
    if (trades.length > 0) {
      console.log('📝 Sample trade:', trades[0]);
    }
    if (sections.length > 0) {
      console.log('📝 Sample section:', sections[0]);
      console.log('🔗 Section tradeIds found:', sections.map(s => s.tradeId));
    }
    if (categories.length > 0) {
      console.log('📝 Sample category:', categories[0]);
      console.log('🔗 Category sectionIds found:', categories.map(c => c.sectionId));
    }
    if (subcategories.length > 0) {
      console.log('📝 Sample subcategory:', subcategories[0]);
      console.log('🔗 Subcategory categoryIds found:', subcategories.map(s => s.categoryId));
    }
    if (types.length > 0) {
      console.log('📝 Sample type:', types[0]);
      console.log('🔗 Type subcategoryIds found:', types.map(t => t.subcategoryId));
    }
    if (sizes.length > 0) {
      console.log('📝 Sample size:', sizes[0]);
      console.log('🔗 Size tradeIds found:', sizes.map(s => s.tradeId));
    }

    // Build tree structure
    console.log('🌲 Building tree structure...');
    const tradeNodes: CategoryNode[] = trades.map(trade => ({
      id: trade.id!,
      name: trade.name,
      level: 'trade' as const,
      children: [],
      productCount: 0,
      descendantCount: 0
    }));

    console.log('🏗️ Created trade nodes:', tradeNodes.map(t => ({ id: t.id, name: t.name })));

    // Add sections to trades
    console.log('➕ Adding sections to trades...');
    tradeNodes.forEach(tradeNode => {
      const tradeSections = sections.filter(s => s.tradeId === tradeNode.id);
      console.log(`  Trade "${tradeNode.name}" (${tradeNode.id}): found ${tradeSections.length} sections`);
      
      if (tradeSections.length > 0) {
        console.log(`    Section IDs:`, tradeSections.map(s => s.id));
      }
      
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
      console.log(`  Trade "${tradeNode.name}" (${tradeNode.id}): found ${tradeSizes.length} sizes`);
      
      const sizesNode: CategoryNode[] = tradeSizes.map(size => ({
        id: size.id!,
        name: size.name,
        level: 'size' as const,
        parentId: tradeNode.id,
        children: [],
        productCount: 0,
        descendantCount: 0
      }));
      tradeNode.children.push(...sizesNode);
      
      console.log(`  Trade "${tradeNode.name}": Total children = ${tradeNode.children.length}`);
    });

    // Add categories to sections
    console.log('➕ Adding categories to sections...');
    let totalCategoriesAdded = 0;
    tradeNodes.forEach(tradeNode => {
      tradeNode.children.filter(n => n.level === 'section').forEach(sectionNode => {
        const sectionCategories = categories.filter(c => c.sectionId === sectionNode.id);
        console.log(`    Section "${sectionNode.name}" (${sectionNode.id}): found ${sectionCategories.length} categories`);
        
        sectionNode.children = sectionCategories.map(category => ({
          id: category.id!,
          name: category.name,
          level: 'category' as const,
          parentId: sectionNode.id,
          children: [],
          productCount: 0,
          descendantCount: 0
        }));
        
        totalCategoriesAdded += sectionCategories.length;
      });
    });
    console.log(`  Total categories added: ${totalCategoriesAdded}`);

    // Add subcategories to categories
    console.log('➕ Adding subcategories to categories...');
    let totalSubcategoriesAdded = 0;
    tradeNodes.forEach(tradeNode => {
      tradeNode.children.filter(n => n.level === 'section').forEach(sectionNode => {
        sectionNode.children.forEach(categoryNode => {
          const categorySubcategories = subcategories.filter(s => s.categoryId === categoryNode.id);
          console.log(`      Category "${categoryNode.name}" (${categoryNode.id}): found ${categorySubcategories.length} subcategories`);
          
          categoryNode.children = categorySubcategories.map(subcategory => ({
            id: subcategory.id!,
            name: subcategory.name,
            level: 'subcategory' as const,
            parentId: categoryNode.id,
            children: [],
            productCount: 0,
            descendantCount: 0
          }));
          
          totalSubcategoriesAdded += categorySubcategories.length;
        });
      });
    });
    console.log(`  Total subcategories added: ${totalSubcategoriesAdded}`);

    // Add types to subcategories
    console.log('➕ Adding types to subcategories...');
    let totalTypesAdded = 0;
    tradeNodes.forEach(tradeNode => {
      tradeNode.children.filter(n => n.level === 'section').forEach(sectionNode => {
        sectionNode.children.forEach(categoryNode => {
          categoryNode.children.forEach(subcategoryNode => {
            const subcategoryTypes = types.filter(t => t.subcategoryId === subcategoryNode.id);
            console.log(`        Subcategory "${subcategoryNode.name}" (${subcategoryNode.id}): found ${subcategoryTypes.length} types`);
            
            subcategoryNode.children = subcategoryTypes.map(type => ({
              id: type.id!,
              name: type.name,
              level: 'type' as const,
              parentId: subcategoryNode.id,
              children: [],
              productCount: 0,
              descendantCount: 0
            }));
            
            totalTypesAdded += subcategoryTypes.length;
          });
        });
      });
    });
    console.log(`  Total types added: ${totalTypesAdded}`);

    // Final summary
    console.log('✅ Tree building complete!');
    console.log('📊 Final tree summary:');
    tradeNodes.forEach(tradeNode => {
      const sectionCount = tradeNode.children.filter(c => c.level === 'section').length;
      const sizeCount = tradeNode.children.filter(c => c.level === 'size').length;
      console.log(`  Trade "${tradeNode.name}": ${sectionCount} sections, ${sizeCount} sizes, total children: ${tradeNode.children.length}`);
    });

    return { success: true, data: tradeNodes };
  } catch (error) {
    console.error('❌ Error getting full category hierarchy:', error);
    return { success: false, error };
  }
};

// Helper functions to get all items at each level
const getAllSections = async (userId: string): Promise<DatabaseResult<ProductSection[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const sections = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductSection[];
    return { success: true, data: sections };
  } catch (error) {
    return { success: false, error };
  }
};

const getAllCategories = async (userId: string): Promise<DatabaseResult<ProductCategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const categories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductCategory[];
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error };
  }
};

const getAllSubcategories = async (userId: string): Promise<DatabaseResult<ProductSubcategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const subcategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductSubcategory[];
    return { success: true, data: subcategories };
  } catch (error) {
    return { success: false, error };
  }
};

const getAllTypes = async (userId: string): Promise<DatabaseResult<ProductType[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_TYPES),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const types = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductType[];
    return { success: true, data: types };
  } catch (error) {
    return { success: false, error };
  }
};

const getAllSizes = async (userId: string): Promise<DatabaseResult<ProductSize[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SIZES),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const sizes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductSize[];
    return { success: true, data: sizes };
  } catch (error) {
    return { success: false, error };
  }
};

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
    if (!newName.trim()) {
      return { success: false, error: 'Name cannot be empty' };
    }

    if (newName.length > 30) {
      return { success: false, error: 'Name must be 30 characters or less' };
    }

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
 * Get usage statistics for a category (how many children and products will be affected)
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

    // Count descendants based on level
    if (level === 'trade') {
      // Get all sections under this trade
      const sectionsQ = query(
        collection(db, COLLECTIONS.PRODUCT_SECTIONS),
        where('tradeId', '==', categoryId),
        where('userId', '==', userId)
      );
      const sectionsSnap = await getDocs(sectionsQ);
      categoryCount += sectionsSnap.size;
      
      // Get categories under each section
      for (const sectionDoc of sectionsSnap.docs) {
        const categoriesQ = query(
          collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
          where('sectionId', '==', sectionDoc.id),
          where('userId', '==', userId)
        );
        const categoriesSnap = await getDocs(categoriesQ);
        categoryCount += categoriesSnap.size;
        
        // Get subcategories under each category
        for (const categoryDoc of categoriesSnap.docs) {
          const subcategoriesQ = query(
            collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
            where('categoryId', '==', categoryDoc.id),
            where('userId', '==', userId)
          );
          const subcategoriesSnap = await getDocs(subcategoriesQ);
          categoryCount += subcategoriesSnap.size;
          
          // Get types under each subcategory
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
      
      // Get sizes under this trade
      const sizesQ = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('tradeId', '==', categoryId),
        where('userId', '==', userId)
      );
      const sizesSnap = await getDocs(sizesQ);
      categoryCount += sizesSnap.size;
      
      // Count products in this trade
      const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, categoryId));
      if (tradeDoc.exists()) {
        const tradeName = tradeDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('trade', '==', tradeName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productCount = productsSnap.size;
      }
    } else if (level === 'section') {
      // Get categories under this section
      const categoriesQ = query(
        collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
        where('sectionId', '==', categoryId),
        where('userId', '==', userId)
      );
      const categoriesSnap = await getDocs(categoriesQ);
      categoryCount += categoriesSnap.size;
      
      // Get subcategories and types
      for (const categoryDoc of categoriesSnap.docs) {
        const subcategoriesQ = query(
          collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
          where('categoryId', '==', categoryDoc.id),
          where('userId', '==', userId)
        );
        const subcategoriesSnap = await getDocs(subcategoriesQ);
        categoryCount += subcategoriesSnap.size;
        
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
      
      // Count products in this section
      const sectionDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SECTIONS, categoryId));
      if (sectionDoc.exists()) {
        const sectionName = sectionDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('section', '==', sectionName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productCount = productsSnap.size;
      }
    } else if (level === 'category') {
      // Get subcategories under this category
      const subcategoriesQ = query(
        collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
        where('categoryId', '==', categoryId),
        where('userId', '==', userId)
      );
      const subcategoriesSnap = await getDocs(subcategoriesQ);
      categoryCount += subcategoriesSnap.size;
      
      // Get types under each subcategory
      for (const subcategoryDoc of subcategoriesSnap.docs) {
        const typesQ = query(
          collection(db, COLLECTIONS.PRODUCT_TYPES),
          where('subcategoryId', '==', subcategoryDoc.id),
          where('userId', '==', userId)
        );
        const typesSnap = await getDocs(typesQ);
        categoryCount += typesSnap.size;
      }
      
      // Count products in this category
      const categoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_CATEGORIES, categoryId));
      if (categoryDoc.exists()) {
        const categoryName = categoryDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('category', '==', categoryName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productCount = productsSnap.size;
      }
    } else if (level === 'subcategory') {
      // Get types under this subcategory
      const typesQ = query(
        collection(db, COLLECTIONS.PRODUCT_TYPES),
        where('subcategoryId', '==', categoryId),
        where('userId', '==', userId)
      );
      const typesSnap = await getDocs(typesQ);
      categoryCount = typesSnap.size;
      
      // Count products in this subcategory
      const subcategoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SUBCATEGORIES, categoryId));
      if (subcategoryDoc.exists()) {
        const subcategoryName = subcategoryDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('subcategory', '==', subcategoryName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productCount = productsSnap.size;
      }
    } else if (level === 'type') {
      // No children for type, just count products
      const typeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TYPES, categoryId));
      if (typeDoc.exists()) {
        const typeName = typeDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('type', '==', typeName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productCount = productsSnap.size;
      }
    } else if (level === 'size') {
      // No children for size, just count products
      const sizeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SIZES, categoryId));
      if (sizeDoc.exists()) {
        const sizeName = sizeDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('size', '==', sizeName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productCount = productsSnap.size;
      }
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
 */
export const deleteCategoryWithChildren = async (
  categoryId: string,
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size',
  userId: string
): Promise<DatabaseResult> => {
  try {
    const batch = writeBatch(db);

    // Recursive deletion based on level
    if (level === 'trade') {
      // Delete all sections under this trade
      const sectionsQ = query(
        collection(db, COLLECTIONS.PRODUCT_SECTIONS),
        where('tradeId', '==', categoryId),
        where('userId', '==', userId)
      );
      const sectionsSnap = await getDocs(sectionsQ);
      
      for (const sectionDoc of sectionsSnap.docs) {
        // Delete categories under each section
        const categoriesQ = query(
          collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
          where('sectionId', '==', sectionDoc.id),
          where('userId', '==', userId)
        );
        const categoriesSnap = await getDocs(categoriesQ);
        
        for (const categoryDoc of categoriesSnap.docs) {
          // Delete subcategories under each category
          const subcategoriesQ = query(
            collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
            where('categoryId', '==', categoryDoc.id),
            where('userId', '==', userId)
          );
          const subcategoriesSnap = await getDocs(subcategoriesQ);
          
          for (const subcategoryDoc of subcategoriesSnap.docs) {
            // Delete types under each subcategory
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
      
      // Delete sizes under this trade
      const sizesQ = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('tradeId', '==', categoryId),
        where('userId', '==', userId)
      );
      const sizesSnap = await getDocs(sizesQ);
      sizesSnap.docs.forEach(sizeDoc => batch.delete(sizeDoc.ref));
      
      // Delete products in this trade
      const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, categoryId));
      if (tradeDoc.exists()) {
        const tradeName = tradeDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('trade', '==', tradeName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      }
      
      // Delete the trade itself
      batch.delete(doc(db, COLLECTIONS.PRODUCT_TRADES, categoryId));
    } else if (level === 'section') {
      // Similar cascade for section...
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
      
      // Delete products
      const sectionDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SECTIONS, categoryId));
      if (sectionDoc.exists()) {
        const sectionName = sectionDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('section', '==', sectionName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      }
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_SECTIONS, categoryId));
    } else if (level === 'category') {
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
      const categoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_CATEGORIES, categoryId));
      if (categoryDoc.exists()) {
        const categoryName = categoryDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('category', '==', categoryName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      }
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_CATEGORIES, categoryId));
    } else if (level === 'subcategory') {
      const typesQ = query(
        collection(db, COLLECTIONS.PRODUCT_TYPES),
        where('subcategoryId', '==', categoryId),
        where('userId', '==', userId)
      );
      const typesSnap = await getDocs(typesQ);
      typesSnap.docs.forEach(typeDoc => batch.delete(typeDoc.ref));
      
      // Delete products
      const subcategoryDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SUBCATEGORIES, categoryId));
      if (subcategoryDoc.exists()) {
        const subcategoryName = subcategoryDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('subcategory', '==', subcategoryName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      }
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_SUBCATEGORIES, categoryId));
    } else if (level === 'type') {
      // Delete products
      const typeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TYPES, categoryId));
      if (typeDoc.exists()) {
        const typeName = typeDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('type', '==', typeName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      }
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_TYPES, categoryId));
    } else if (level === 'size') {
      // Delete products
      const sizeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SIZES, categoryId));
      if (sizeDoc.exists()) {
        const sizeName = sizeDoc.data().name;
        const productsQ = query(
          collection(db, 'products'),
          where('size', '==', sizeName),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQ);
        productsSnap.docs.forEach(productDoc => batch.delete(productDoc.ref));
      }
      
      batch.delete(doc(db, COLLECTIONS.PRODUCT_SIZES, categoryId));
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error deleting category with children:', error);
    return { success: false, error };
  }
};

