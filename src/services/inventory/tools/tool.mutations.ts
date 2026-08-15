// src/services/inventory/tools/tool.mutations.ts

import { ToolItem, ToolResponse } from './tool.types';
import { inventoryApiRequest, ApiError } from '../inventoryApi';

interface ToolRow {
  id: number;
}

interface BrandRow {
  id: number;
  name: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

// ToolItem.brand is a plain name string (set via the brand picker / "add brand"
// flow in GeneralTab), but the API stores brandId as a FK — resolve the name to
// an id here so writes match the id the brand was actually created with.
async function resolveBrandId(brandName: string | undefined): Promise<number | null> {
  if (!brandName || !brandName.trim()) return null;
  const brands = await inventoryApiRequest<BrandRow[]>(
    '/inventory/categories/lookups/brands?itemType=tool'
  );
  const match = brands.find(b => b.name.toLowerCase() === brandName.trim().toLowerCase());
  return match ? match.id : null;
}

function toApiBody(toolData: Partial<ToolItem>, brandId: number | null) {
  return {
    tradeId: toolData.tradeId ? Number(toolData.tradeId) : undefined,
    sectionId: toolData.sectionId ? Number(toolData.sectionId) : undefined,
    categoryId: toolData.categoryId ? Number(toolData.categoryId) : undefined,
    subcategoryId: toolData.subcategoryId ? Number(toolData.subcategoryId) : undefined,
    brandId: brandId ?? undefined,
    name: toolData.name,
    description: toolData.description,
    notes: toolData.notes,
    location: toolData.location,
    status: toolData.status,
    purchaseDate: toolData.purchaseDate || undefined,
    warrantyExpiration: toolData.warrantyExpiration || undefined,
    minimumCustomerCharge: toolData.minimumCustomerCharge,
    imageUrl: toolData.imageUrl,
  };
}

/**
 * Create a new tool item
 */
export const createToolItem = async (
  toolData: Partial<ToolItem>,
  _userId: string
): Promise<ToolResponse<string>> => {
  try {
    const brandId = await resolveBrandId(toolData.brand);
    const row = await inventoryApiRequest<ToolRow>('/inventory/tools', {
      method: 'POST',
      body: JSON.stringify(toApiBody(toolData, brandId)),
    });
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error creating tool:', error);
    return { success: false, error: errorMessage(error, 'Failed to create tool') };
  }
};

/**
 * Update an existing tool item
 */
export const updateToolItem = async (
  toolId: string,
  toolData: Partial<ToolItem>
): Promise<ToolResponse<void>> => {
  try {
    const brandId = await resolveBrandId(toolData.brand);
    await inventoryApiRequest<ToolRow>(`/inventory/tools/${toolId}`, {
      method: 'PATCH',
      body: JSON.stringify(toApiBody(toolData, brandId)),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating tool:', error);
    return { success: false, error: errorMessage(error, 'Failed to update tool') };
  }
};

/**
 * Delete a tool item
 */
export const deleteToolItem = async (
  toolId: string
): Promise<ToolResponse<void>> => {
  try {
    await inventoryApiRequest<void>(`/inventory/tools/${toolId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete tool') };
  }
};

/**
 * Update tool status
 */
export const updateToolStatus = async (
  toolId: string,
  status: 'available' | 'in-use' | 'maintenance'
): Promise<ToolResponse<void>> => {
  try {
    await inventoryApiRequest<ToolRow>(`/inventory/tools/${toolId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating tool status:', error);
    return { success: false, error: errorMessage(error, 'Failed to update tool status') };
  }
};
