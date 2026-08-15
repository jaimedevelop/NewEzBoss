// src/services/inventory/equipment/equipment.mutations.ts

import { EquipmentItem, EquipmentResponse, RentalEntry } from './equipment.types';
import { inventoryApiRequest, ApiError } from '../inventoryApi';

interface EquipmentRow {
  id: number;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

function toRentalEntryBody(entry: Partial<RentalEntry>) {
  return {
    storeName: entry.storeName,
    storeLocation: entry.storeLocation,
    dailyRate: entry.dailyRate,
    weeklyRate: entry.weeklyRate,
    monthlyRate: entry.monthlyRate,
    pickupFee: entry.pickupFee,
    deliveryFee: entry.deliveryFee,
    extraFees: entry.extraFees,
  };
}

function toApiBody(equipmentData: Partial<EquipmentItem>) {
  return {
    tradeId: equipmentData.tradeId ? Number(equipmentData.tradeId) : undefined,
    sectionId: equipmentData.sectionId ? Number(equipmentData.sectionId) : undefined,
    categoryId: equipmentData.categoryId ? Number(equipmentData.categoryId) : undefined,
    subcategoryId: equipmentData.subcategoryId ? Number(equipmentData.subcategoryId) : undefined,
    name: equipmentData.name,
    description: equipmentData.description,
    notes: equipmentData.notes,
    equipmentType: equipmentData.equipmentType,
    status: equipmentData.status,
    dueDate: equipmentData.dueDate || undefined,
    minimumCustomerCharge: equipmentData.minimumCustomerCharge,
    isPaidOff: equipmentData.isPaidOff,
    loanAmount: equipmentData.loanAmount,
    monthlyPayment: equipmentData.monthlyPayment,
    loanStartDate: equipmentData.loanStartDate || undefined,
    loanPayoffDate: equipmentData.loanPayoffDate || undefined,
    remainingBalance: equipmentData.remainingBalance,
    imageUrl: equipmentData.imageUrl,
    rentalEntries: equipmentData.rentalEntries?.map(toRentalEntryBody),
  };
}

/**
 * Create a new equipment item
 */
export const createEquipmentItem = async (
  equipmentData: Partial<EquipmentItem>,
  _userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    const row = await inventoryApiRequest<EquipmentRow>('/inventory/equipment', {
      method: 'POST',
      body: JSON.stringify(toApiBody(equipmentData)),
    });
    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error creating equipment:', error);
    return { success: false, error: errorMessage(error, 'Failed to create equipment') };
  }
};

/**
 * Update an existing equipment item
 */
export const updateEquipmentItem = async (
  equipmentId: string,
  equipmentData: Partial<EquipmentItem>
): Promise<EquipmentResponse<void>> => {
  try {
    await inventoryApiRequest<EquipmentRow>(`/inventory/equipment/${equipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(toApiBody(equipmentData)),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment:', error);
    return { success: false, error: errorMessage(error, 'Failed to update equipment') };
  }
};

/**
 * Delete an equipment item
 */
export const deleteEquipmentItem = async (
  equipmentId: string
): Promise<EquipmentResponse<void>> => {
  try {
    await inventoryApiRequest<void>(`/inventory/equipment/${equipmentId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting equipment:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete equipment') };
  }
};

/**
 * Update equipment status
 */
export const updateEquipmentStatus = async (
  equipmentId: string,
  status: 'available' | 'in-use' | 'maintenance'
): Promise<EquipmentResponse<void>> => {
  try {
    await inventoryApiRequest<EquipmentRow>(`/inventory/equipment/${equipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating equipment status:', error);
    return { success: false, error: errorMessage(error, 'Failed to update equipment status') };
  }
};
