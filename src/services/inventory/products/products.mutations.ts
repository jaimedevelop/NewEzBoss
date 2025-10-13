// src/services/products/products.mutations.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import type { DatabaseResult } from '../../../firebase/database';
import { InventoryProduct, BulkProductUpdate } from './products.types';
import { COLLECTION_NAME, calculateAvailable, validateProductData } from './products.utils';

/**
 * Create a new product
 */
export const createProduct = async (
  productData: Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'available'>
): Promise<DatabaseResult> => {
  try {
    // Validate product data
    const validation = validateProductData(productData);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      };
    }

    // Calculate available quantity
    const available = calculateAvailable(productData.onHand, productData.assigned);

    const docRef: DocumentReference = await addDoc(collection(db, COLLECTION_NAME), {
      ...productData,
      available,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Product created successfully:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error creating product:', error);
    return { success: false, error };
  }
};

/**
 * Update a product
 */
export const updateProduct = async (
  productId: string,
  productData: Partial<InventoryProduct>
): Promise<DatabaseResult> => {
  try {
    // Validate product data
    const validation = validateProductData(productData);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      };
    }

    const productRef = doc(db, COLLECTION_NAME, productId);

    // Calculate available if onHand or assigned changed
    const updateData = { ...productData };
    if ('onHand' in updateData || 'assigned' in updateData) {
      // Get current data to calculate available
      const currentDoc = await getDoc(productRef);
      if (currentDoc.exists()) {
        const currentData = currentDoc.data() as InventoryProduct;
        const newOnHand = updateData.onHand ?? currentData.onHand;
        const newAssigned = updateData.assigned ?? currentData.assigned;
        updateData.available = calculateAvailable(newOnHand, newAssigned);
      }
    }

    await updateDoc(productRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Product updated successfully:', productId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return { success: false, error };
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (productId: string): Promise<DatabaseResult> => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);
    await deleteDoc(productRef);

    console.log('✅ Product deleted successfully:', productId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    return { success: false, error };
  }
};

/**
 * Bulk update products
 * Useful for batch operations like updating multiple prices or categories
 */
export const bulkUpdateProducts = async (
  updates: BulkProductUpdate[]
): Promise<DatabaseResult> => {
  try {
    // Validate all updates first
    for (const update of updates) {
      const validation = validateProductData(update.data);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed for product ${update.id}: ${validation.errors.join(', ')}`,
        };
      }
    }

    const batch = writeBatch(db);

    for (const update of updates) {
      const productRef = doc(db, COLLECTION_NAME, update.id);

      // Calculate available if needed
      const updateData = { ...update.data };
      if ('onHand' in updateData || 'assigned' in updateData) {
        const currentDoc = await getDoc(productRef);
        if (currentDoc.exists()) {
          const currentData = currentDoc.data() as InventoryProduct;
          const newOnHand = updateData.onHand ?? currentData.onHand;
          const newAssigned = updateData.assigned ?? currentData.assigned;
          updateData.available = calculateAvailable(newOnHand, newAssigned);
        }
      }

      batch.update(productRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`✅ Bulk updated ${updates.length} products successfully`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error bulk updating products:', error);
    return { success: false, error };
  }
};

/**
 * Duplicate a product (useful for creating variants)
 */
export const duplicateProduct = async (
  productId: string,
  modifications?: Partial<InventoryProduct>
): Promise<DatabaseResult> => {
  try {
    // Get the original product
    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const originalProduct = productSnap.data() as InventoryProduct;

    // Create duplicate with modifications
    const duplicateData = {
      ...originalProduct,
      ...modifications,
      name: modifications?.name || `${originalProduct.name} (Copy)`,
      sku: modifications?.sku || `${originalProduct.sku}-COPY`,
      // Reset quantities for safety
      onHand: modifications?.onHand ?? 0,
      assigned: modifications?.assigned ?? 0,
      available: 0,
    };

    // Remove fields that shouldn't be duplicated
    delete (duplicateData as any).id;
    delete (duplicateData as any).createdAt;
    delete (duplicateData as any).updatedAt;

    // Create the duplicate
    return await createProduct(duplicateData);
  } catch (error) {
    console.error('❌ Error duplicating product:', error);
    return { success: false, error };
  }
};