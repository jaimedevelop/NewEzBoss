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

// Interfaces for hierarchical categories
export interface ProductSection {
  id?: string;
  name: string;
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

// Missing ProductUnit interface
export interface ProductUnit {
  id?: string;
  name: string;
  sectionId: string;
  userId: string;
  createdAt?: any;
}

// New interface for sizes
export interface ProductSize {
  id?: string;
  name: string;
  sectionId: string;
  userId: string;
  createdAt?: any;
}

const COLLECTIONS = {
  PRODUCT_SECTIONS: 'productSections',
  PRODUCT_CATEGORIES: 'productCategories', 
  PRODUCT_SUBCATEGORIES: 'productSubcategories',
  PRODUCT_TYPES: 'productTypes',
  PRODUCT_UNITS: 'productUnits', // Added missing collection
  PRODUCT_SIZES: 'productSizes',
  STANDALONE_PRODUCT_TYPES: 'standaloneProductTypes'
};

// Default sections (not stored in database, just used as fallback)
const DEFAULT_SECTIONS = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'General',
  'Tools',
  'Safety',
  'Fasteners',
  'Lumber',
  'Drywall',
  'Flooring',
  'Roofing',
  'Insulation'
];

// Default product types
const DEFAULT_PRODUCT_TYPES = [
  'Material',
  'Tool', 
  'Equipment',
  'Rental',
  'Consumable',
  'Safety'
];

// === SECTION OPERATIONS ===
export const addProductSection = async (name: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates (case-insensitive)
    const existingResult = await getProductSections(userId);
    if (existingResult.success && existingResult.data) {
      const allSections = [...DEFAULT_SECTIONS, ...existingResult.data.map(s => s.name)];
      const isDuplicate = allSections.some(section => 
        section.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A section with this name already exists' };
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
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: sectionRef.id };
  } catch (error) {
    console.error('Error adding product section:', error);
    return { success: false, error };
  }
};

export const getProductSections = async (userId: string): Promise<DatabaseResult<ProductSection[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const userSections: ProductSection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSection[];

    return { success: true, data: userSections };
  } catch (error) {
    console.error('Error getting product sections:', error);
    return { success: false, error };
  }
};

export const getAllAvailableSections = async (userId: string): Promise<DatabaseResult<string[]>> => {
  try {
    const userSectionsResult = await getProductSections(userId);
    const userSections = userSectionsResult.success ? userSectionsResult.data || [] : [];
    
    // Combine default sections with user sections
    const allSections = [
      ...DEFAULT_SECTIONS,
      ...userSections.map(section => section.name)
    ];

    // Remove duplicates and sort
    const uniqueSections = Array.from(new Set(allSections)).sort();
    
    return { success: true, data: uniqueSections };
  } catch (error) {
    console.error('Error getting all available sections:', error);
    return { success: false, error };
  }
};

// === UNIT OPERATIONS ===
export const addProductUnit = async (name: string, sectionName: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates in this section
    const existingResult = await getProductUnits(sectionName, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(unit => 
        unit.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A unit with this name already exists in this section' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Unit name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Unit name cannot be empty' };
    }

    const unitRef = await addDoc(collection(db, COLLECTIONS.PRODUCT_UNITS), {
      name: name.trim(),
      sectionId: sectionName, // Using section name as ID for simplicity
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: unitRef.id };
  } catch (error) {
    console.error('Error adding product unit:', error);
    return { success: false, error };
  }
};

export const getProductUnits = async (sectionName: string, userId: string): Promise<DatabaseResult<ProductUnit[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_UNITS),
      where('sectionId', '==', sectionName),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const units: ProductUnit[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductUnit[];

    return { success: true, data: units };
  } catch (error) {
    console.error('Error getting product units:', error);
    return { success: false, error };
  }
};

// === SIZE OPERATIONS ===
export const addProductSize = async (name: string, sectionName: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates in this section
    const existingResult = await getProductSizes(sectionName, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(size => 
        size.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A size with this name already exists in this section' };
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
      sectionId: sectionName, // Using section name as ID for simplicity
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: sizeRef.id };
  } catch (error) {
    console.error('Error adding product size:', error);
    return { success: false, error };
  }
};

export const getProductSizes = async (sectionName: string, userId: string): Promise<DatabaseResult<ProductSize[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SIZES),
      where('sectionId', '==', sectionName),
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

// === CATEGORY OPERATIONS ===
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

export interface StandaloneProductType {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

export const addStandaloneProductType = async (name: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates (case-insensitive)
    const existingResult = await getStandaloneProductTypes(userId);
    if (existingResult.success && existingResult.data) {
      const allTypes = [...DEFAULT_PRODUCT_TYPES, ...existingResult.data.map(t => t.name)];
      const isDuplicate = allTypes.some(type => 
        type.toLowerCase() === name.toLowerCase()
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
    
    // Combine default types with user types
    const allTypes = [
      ...DEFAULT_PRODUCT_TYPES,
      ...userTypes.map(type => type.name)
    ];

    // Remove duplicates and sort
    const uniqueTypes = Array.from(new Set(allTypes)).sort();
    
    return { success: true, data: uniqueTypes };
  } catch (error) {
    console.error('Error getting all available product types:', error);
    return { success: false, error };
  }
};