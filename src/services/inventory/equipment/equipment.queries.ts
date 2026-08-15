// src/services/inventory/equipment/equipment.queries.ts

import { EquipmentItem, EquipmentFilters, EquipmentResponse, RentalEntry } from './equipment.types';
import { inventoryApiRequest, ApiError } from '../inventoryApi';
import { listHierarchy } from '../../categories/hierarchyApi';

interface RentalEntryRow {
  id: number;
  equipmentId: number;
  rentalStoreId: number | null;
  storeName: string;
  storeLocation: string | null;
  dailyRate: string | number;
  weeklyRate: string | number;
  monthlyRate: string | number;
  pickupFee: string | number;
  deliveryFee: string | number;
  extraFees: string | number;
}

interface EquipmentRow {
  id: number;
  tradeId: number | null;
  sectionId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  name: string;
  description: string | null;
  notes: string | null;
  equipmentType: 'owned' | 'rented';
  status: string;
  dueDate: string | null;
  minimumCustomerCharge: string | number;
  isPaidOff: boolean;
  loanAmount: string | number | null;
  monthlyPayment: string | number | null;
  loanStartDate: string | null;
  loanPayoffDate: string | null;
  remainingBalance: string | number | null;
  imageUrl: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  rentalEntries: RentalEntryRow[];
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

// The API stores only FK ids on the equipment row (no denormalized names); the
// UI expects tradeName/sectionName/categoryName/subcategoryName strings for
// display, filtering, and search, so this resolves the whole hierarchy once
// per call and joins it in memory rather than doing it N times per row.
async function buildNameMaps() {
  const [trades, sections, categories, subcategories] = await Promise.all([
    listHierarchy('trade'),
    listHierarchy('section'),
    listHierarchy('category'),
    listHierarchy('subcategory'),
  ]);

  const nameById = (rows: { id: number; name: string }[]) =>
    new Map(rows.map(r => [r.id, r.name]));

  return {
    tradeNames: nameById(trades),
    sectionNames: nameById(sections),
    categoryNames: nameById(categories),
    subcategoryNames: nameById(subcategories),
  };
}

function toRentalEntry(row: RentalEntryRow): RentalEntry {
  return {
    id: String(row.id),
    storeName: row.storeName,
    storeLocation: row.storeLocation ?? '',
    dailyRate: Number(row.dailyRate) || 0,
    weeklyRate: Number(row.weeklyRate) || 0,
    monthlyRate: Number(row.monthlyRate) || 0,
    pickupFee: Number(row.pickupFee) || 0,
    deliveryFee: Number(row.deliveryFee) || 0,
    extraFees: Number(row.extraFees) || 0,
  };
}

function toEquipmentItem(
  row: EquipmentRow,
  maps: Awaited<ReturnType<typeof buildNameMaps>>
): EquipmentItem {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    notes: row.notes ?? '',
    equipmentType: row.equipmentType,
    tradeId: row.tradeId ? String(row.tradeId) : '',
    tradeName: row.tradeId ? maps.tradeNames.get(row.tradeId) ?? '' : '',
    sectionId: row.sectionId ? String(row.sectionId) : '',
    sectionName: row.sectionId ? maps.sectionNames.get(row.sectionId) ?? '' : '',
    categoryId: row.categoryId ? String(row.categoryId) : '',
    categoryName: row.categoryId ? maps.categoryNames.get(row.categoryId) ?? '' : '',
    subcategoryId: row.subcategoryId ? String(row.subcategoryId) : '',
    subcategoryName: row.subcategoryId ? maps.subcategoryNames.get(row.subcategoryId) ?? '' : '',
    status: (row.status as EquipmentItem['status']) ?? 'available',
    dueDate: row.dueDate ?? undefined,
    rentalEntries: (row.rentalEntries ?? []).map(toRentalEntry),
    minimumCustomerCharge: Number(row.minimumCustomerCharge) || 0,
    isPaidOff: row.isPaidOff,
    loanAmount: row.loanAmount != null ? Number(row.loanAmount) : undefined,
    monthlyPayment: row.monthlyPayment != null ? Number(row.monthlyPayment) : undefined,
    loanStartDate: row.loanStartDate ?? undefined,
    loanPayoffDate: row.loanPayoffDate ?? undefined,
    remainingBalance: row.remainingBalance != null ? Number(row.remainingBalance) : undefined,
    imageUrl: row.imageUrl ?? '',
    userId: String(row.userId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get a single equipment item by ID
 */
export const getEquipmentItem = async (
  equipmentId: string
): Promise<EquipmentResponse<EquipmentItem>> => {
  try {
    const [row, maps] = await Promise.all([
      inventoryApiRequest<EquipmentRow>(`/inventory/equipment/${equipmentId}`),
      buildNameMaps(),
    ]);
    return { success: true, data: toEquipmentItem(row, maps) };
  } catch (error) {
    console.error('Error getting equipment:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch equipment') };
  }
};

/**
 * Get all equipment with optional filters (no pagination)
 */
export const getEquipment = async (
  _userId: string,
  filters?: EquipmentFilters
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  try {
    const params = new URLSearchParams();
    if (filters?.tradeId) params.set('tradeId', filters.tradeId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.subcategoryId) params.set('subcategoryId', filters.subcategoryId);
    if (filters?.equipmentType) params.set('equipmentType', filters.equipmentType);
    if (filters?.status) params.set('status', filters.status);

    const qs = params.toString();
    const [rows, maps] = await Promise.all([
      inventoryApiRequest<EquipmentRow[]>(`/inventory/equipment${qs ? `?${qs}` : ''}`),
      buildNameMaps(),
    ]);

    let equipment = rows.map(row => toEquipmentItem(row, maps));

    // Client-side sort — the API sorts by name only; type/dueDate/charge/status
    // sorting mirrors the old Firestore orderBy(filters.sortBy) behavior.
    if (filters?.sortBy && filters.sortBy !== 'name') {
      const sortBy = filters.sortBy;
      equipment = [...equipment].sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        if (typeof av === 'number' && typeof bv === 'number') return av - bv;
        return String(av ?? '').localeCompare(String(bv ?? ''));
      });
      if (filters.sortOrder === 'desc') equipment.reverse();
    } else if (filters?.sortOrder === 'desc') {
      equipment.reverse();
    }

    // Apply search filter (client-side)
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      equipment = equipment.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.notes?.toLowerCase().includes(searchLower) ||
        item.tradeName?.toLowerCase().includes(searchLower) ||
        item.sectionName?.toLowerCase().includes(searchLower) ||
        item.categoryName?.toLowerCase().includes(searchLower) ||
        item.subcategoryName?.toLowerCase().includes(searchLower) ||
        (item.rentalEntries ?? []).some(entry =>
          entry.storeName.toLowerCase().includes(searchLower) ||
          entry.storeLocation?.toLowerCase().includes(searchLower)
        )
      );
    }

    return { success: true, data: equipment };
  } catch (error) {
    console.error('Error getting equipment:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch equipment') };
  }
};

/**
 * Get equipment by trade
 */
export const getEquipmentByTrade = async (
  userId: string,
  tradeId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  return getEquipment(userId, { tradeId, sortBy: 'name', sortOrder: 'asc' });
};

/**
 * Get available equipment only
 */
export const getAvailableEquipment = async (
  userId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  return getEquipment(userId, { status: 'available', sortBy: 'name', sortOrder: 'asc' });
};

/**
 * Get rented equipment only
 */
export const getRentedEquipment = async (
  userId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  return getEquipment(userId, { equipmentType: 'rented', sortBy: 'name', sortOrder: 'asc' });
};

/**
 * Get owned equipment only
 */
export const getOwnedEquipment = async (
  userId: string
): Promise<EquipmentResponse<EquipmentItem[]>> => {
  return getEquipment(userId, { equipmentType: 'owned', sortBy: 'name', sortOrder: 'asc' });
};
