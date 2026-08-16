// src/services/inventory/labor/labor.queries.ts
import { LaborItem, LaborFilters, LaborResponse, PricingStrategy, MeasurementUnit } from './labor.types';
import { inventoryApiRequest, ApiError } from '../inventoryApi';
import { listHierarchy } from '../../categories/hierarchyApi';

interface LaborChildRow {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface LaborRow {
  id: number;
  tradeId: number | null;
  sectionId: number | null;
  categoryId: number | null;
  name: string;
  description: string | null;
  isActive: boolean;
  estimatedHours: number | null;
  flatRates: LaborChildRow[];
  pricingProfiles: LaborChildRow[];
  materialEntries: LaborChildRow[];
  hourlyRates: LaborChildRow[];
  tasks: LaborChildRow[];
  userId: number;
  createdAt: string;
  updatedAt: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

async function buildNameMaps() {
  const [trades, sections, categories] = await Promise.all([
    listHierarchy('trade', undefined),
    listHierarchy('section', 'labor'),
    listHierarchy('category', 'labor'),
  ]);

  const nameById = (rows: { id: number; name: string }[]) =>
    new Map(rows.map(r => [r.id, r.name]));

  return {
    tradeNames: nameById(trades),
    sectionNames: nameById(sections),
    categoryNames: nameById(categories),
  };
}

function toLaborItem(
  row: LaborRow,
  maps: Awaited<ReturnType<typeof buildNameMaps>>
): LaborItem {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    tradeId: row.tradeId ? String(row.tradeId) : '',
    tradeName: row.tradeId ? maps.tradeNames.get(row.tradeId) ?? '' : '',
    sectionId: row.sectionId ? String(row.sectionId) : '',
    sectionName: row.sectionId ? maps.sectionNames.get(row.sectionId) ?? '' : '',
    categoryId: row.categoryId ? String(row.categoryId) : '',
    categoryName: row.categoryId ? maps.categoryNames.get(row.categoryId) ?? '' : '',
    isActive: row.isActive,
    estimatedHours: row.estimatedHours ?? undefined,
    flatRates: (row.flatRates ?? []).map(r => ({
      id: String(r.id),
      name: r.name,
      rate: Number(r.rate) || 0,
    })),
    pricingProfiles: (row.pricingProfiles ?? []).map(r => ({
      id: String(r.id),
      name: r.name,
      strategy: r.strategy as PricingStrategy,
      unit: (r.unit as MeasurementUnit | null) ?? undefined,
      baseRate: Number(r.baseRate) || 0,
      minimumCharge: r.minimumCharge != null ? Number(r.minimumCharge) : undefined,
      includedUnits: r.includedUnits != null ? Number(r.includedUnits) : undefined,
      overageRate: r.overageRate != null ? Number(r.overageRate) : undefined,
      isDefault: Boolean(r.isDefault),
    })),
    materialEntries: (row.materialEntries ?? []).map(r => ({
      id: String(r.id),
      name: r.name,
      quantity: Number(r.quantity) || 0,
      pricePerUnit: Number(r.pricePerUnit) || 0,
      description: (r.description as string | null) ?? undefined,
    })),
    hourlyRates: (row.hourlyRates ?? []).map(r => ({
      id: String(r.id),
      name: r.name,
      skillLevel: (r.skillLevel as string | null) ?? '',
      hourlyRate: Number(r.hourlyRate) || 0,
    })),
    tasks: (row.tasks ?? []).map(r => ({
      id: String(r.id),
      name: r.name,
      description: (r.description as string | null) ?? '',
    })),
    userId: String(row.userId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get a single labor item by ID
 */
export const getLaborItem = async (
  laborId: string
): Promise<LaborResponse<LaborItem>> => {
  try {
    const [row, maps] = await Promise.all([
      inventoryApiRequest<LaborRow>(`/inventory/labor/${laborId}`),
      buildNameMaps(),
    ]);
    return { success: true, data: toLaborItem(row, maps) };
  } catch (error) {
    console.error('Error getting labor item:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch labor item') };
  }
};

/**
 * Get all labor items with optional filters (no pagination)
 */
export const getLaborItems = async (
  _userId: string,
  filters?: LaborFilters
): Promise<LaborResponse<LaborItem[]>> => {
  try {
    const params = new URLSearchParams();
    if (filters?.tradeId) params.set('tradeId', filters.tradeId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));

    const qs = params.toString();
    const [rows, maps] = await Promise.all([
      inventoryApiRequest<LaborRow[]>(`/inventory/labor${qs ? `?${qs}` : ''}`),
      buildNameMaps(),
    ]);

    let laborItems = rows.map(row => toLaborItem(row, maps));

    // Apply search filter (client-side)
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      laborItems = laborItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.tradeName?.toLowerCase().includes(searchLower) ||
        item.sectionName?.toLowerCase().includes(searchLower) ||
        item.categoryName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply tier filter (client-side)
    if (filters?.tier) {
      laborItems = laborItems.filter(item =>
        item.flatRates?.some(rate => rate.name === filters.tier)
      );
    }

    return { success: true, data: laborItems };
  } catch (error) {
    console.error('Error getting labor items:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch labor items') };
  }
};

/**
 * Get labor items by trade
 */
export const getLaborItemsByTrade = async (
  userId: string,
  tradeId: string
): Promise<LaborResponse<LaborItem[]>> => {
  return getLaborItems(userId, { tradeId });
};

/**
 * Get active labor items only
 */
export const getActiveLaborItems = async (
  userId: string
): Promise<LaborResponse<LaborItem[]>> => {
  return getLaborItems(userId, { isActive: true });
};
