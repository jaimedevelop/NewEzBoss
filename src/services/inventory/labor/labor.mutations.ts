// src/services/inventory/labor/labor.mutations.ts
import { LaborItem, LaborResponse } from './labor.types';
import { inventoryApiRequest, ApiError } from '../inventoryApi';

interface LaborRow {
  id: number;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

function toApiBody(laborData: Partial<LaborItem>) {
  return {
    tradeId: laborData.tradeId ? Number(laborData.tradeId) : undefined,
    sectionId: laborData.sectionId ? Number(laborData.sectionId) : undefined,
    categoryId: laborData.categoryId ? Number(laborData.categoryId) : undefined,
    name: laborData.name,
    description: laborData.description,
    isActive: laborData.isActive,
    estimatedHours: laborData.estimatedHours,
    flatRates: laborData.flatRates?.map(r => ({ name: r.name, rate: r.rate })),
    pricingProfiles: laborData.pricingProfiles?.map(p => ({
      name: p.name,
      strategy: p.strategy,
      unit: p.unit,
      baseRate: p.baseRate,
      minimumCharge: p.minimumCharge,
      includedUnits: p.includedUnits,
      overageRate: p.overageRate,
      isDefault: p.isDefault,
    })),
    materialEntries: laborData.materialEntries?.map(m => ({
      name: m.name,
      quantity: m.quantity,
      pricePerUnit: m.pricePerUnit,
      description: m.description,
    })),
    hourlyRates: laborData.hourlyRates?.map(r => ({
      name: r.name,
      skillLevel: r.skillLevel,
      hourlyRate: r.hourlyRate,
    })),
    tasks: laborData.tasks?.map(t => ({ name: t.name, description: t.description })),
  };
}

/**
 * Create a new labor item
 */
export const createLaborItem = async (
  laborData: Partial<LaborItem>,
  _userId: string
): Promise<LaborResponse<string>> => {
  try {
    const row = await inventoryApiRequest<LaborRow>('/inventory/labor', {
      method: 'POST',
      body: JSON.stringify(toApiBody(laborData)),
    });
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error creating labor item:', error);
    return { success: false, error: errorMessage(error, 'Failed to create labor item') };
  }
};

/**
 * Update an existing labor item
 */
export const updateLaborItem = async (
  laborId: string,
  laborData: Partial<LaborItem>
): Promise<LaborResponse<void>> => {
  try {
    await inventoryApiRequest<LaborRow>(`/inventory/labor/${laborId}`, {
      method: 'PATCH',
      body: JSON.stringify(toApiBody(laborData)),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating labor item:', error);
    return { success: false, error: errorMessage(error, 'Failed to update labor item') };
  }
};

/**
 * Delete a labor item
 */
export const deleteLaborItem = async (
  laborId: string
): Promise<LaborResponse<void>> => {
  try {
    await inventoryApiRequest<void>(`/inventory/labor/${laborId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting labor item:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete labor item') };
  }
};

/**
 * Toggle labor item active status
 */
export const toggleLaborItemStatus = async (
  laborId: string,
  isActive: boolean
): Promise<LaborResponse<void>> => {
  try {
    await inventoryApiRequest<LaborRow>(`/inventory/labor/${laborId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return { success: true };
  } catch (error) {
    console.error('Error toggling labor item status:', error);
    return { success: false, error: errorMessage(error, 'Failed to toggle labor item status') };
  }
};
