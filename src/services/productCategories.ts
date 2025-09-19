// src/services/productCategories.ts

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentSnapshot,
  QuerySnapshot
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