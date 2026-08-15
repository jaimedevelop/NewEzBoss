// src/services/inventory/tools/tool.queries.ts

import { ToolItem, ToolFilters, ToolResponse } from './tool.types';
import { inventoryApiRequest, ApiError } from '../inventoryApi';
import { listHierarchy } from '../../categories/hierarchyApi';

interface ToolRow {
  id: number;
  tradeId: number | null;
  sectionId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  brandId: number | null;
  name: string;
  description: string | null;
  notes: string | null;
  location: string | null;
  status: string;
  purchaseDate: string | null;
  warrantyExpiration: string | null;
  minimumCustomerCharge: string | number;
  imageUrl: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface BrandRow {
  id: number;
  name: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

// The API stores only FK ids on the tool row (no denormalized names); the UI
// expects tradeName/sectionName/.../brand strings for display, filtering, and
// search, so this resolves the whole hierarchy + tool-brand list once per call
// and joins them in memory rather than doing it N times per row.
async function buildNameMaps() {
  const [trades, sections, categories, subcategories, brands] = await Promise.all([
    listHierarchy('trade'),
    listHierarchy('section'),
    listHierarchy('category'),
    listHierarchy('subcategory'),
    inventoryApiRequest<BrandRow[]>('/inventory/categories/lookups/brands?itemType=tool'),
  ]);

  const nameById = (rows: { id: number; name: string }[]) =>
    new Map(rows.map(r => [r.id, r.name]));

  return {
    tradeNames: nameById(trades),
    sectionNames: nameById(sections),
    categoryNames: nameById(categories),
    subcategoryNames: nameById(subcategories),
    brandNames: nameById(brands),
  };
}

function toToolItem(
  row: ToolRow,
  maps: Awaited<ReturnType<typeof buildNameMaps>>
): ToolItem {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    notes: row.notes ?? '',
    tradeId: row.tradeId ? String(row.tradeId) : '',
    tradeName: row.tradeId ? maps.tradeNames.get(row.tradeId) ?? '' : '',
    sectionId: row.sectionId ? String(row.sectionId) : '',
    sectionName: row.sectionId ? maps.sectionNames.get(row.sectionId) ?? '' : '',
    categoryId: row.categoryId ? String(row.categoryId) : '',
    categoryName: row.categoryId ? maps.categoryNames.get(row.categoryId) ?? '' : '',
    subcategoryId: row.subcategoryId ? String(row.subcategoryId) : '',
    subcategoryName: row.subcategoryId ? maps.subcategoryNames.get(row.subcategoryId) ?? '' : '',
    brandId: row.brandId ? String(row.brandId) : undefined,
    brand: row.brandId ? maps.brandNames.get(row.brandId) ?? '' : '',
    location: row.location ?? '',
    status: (row.status as ToolItem['status']) ?? 'available',
    purchaseDate: row.purchaseDate ?? '',
    warrantyExpiration: row.warrantyExpiration ?? '',
    minimumCustomerCharge: Number(row.minimumCustomerCharge) || 0,
    imageUrl: row.imageUrl ?? '',
    userId: String(row.userId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get a single tool item by ID
 */
export const getToolItem = async (
  toolId: string
): Promise<ToolResponse<ToolItem>> => {
  try {
    const [row, maps] = await Promise.all([
      inventoryApiRequest<ToolRow>(`/inventory/tools/${toolId}`),
      buildNameMaps(),
    ]);
    return { success: true, data: toToolItem(row, maps) };
  } catch (error) {
    console.error('Error getting tool:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch tool') };
  }
};

/**
 * Get all tools with optional filters (no pagination)
 */
export const getTools = async (
  _userId: string,
  filters?: ToolFilters
): Promise<ToolResponse<ToolItem[]>> => {
  try {
    const params = new URLSearchParams();
    if (filters?.tradeId) params.set('tradeId', filters.tradeId);
    if (filters?.sectionId) params.set('sectionId', filters.sectionId);
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.subcategoryId) params.set('subcategoryId', filters.subcategoryId);
    if (filters?.status) params.set('status', filters.status);

    const qs = params.toString();
    const [rows, maps] = await Promise.all([
      inventoryApiRequest<ToolRow[]>(`/inventory/tools${qs ? `?${qs}` : ''}`),
      buildNameMaps(),
    ]);

    let tools = rows.map(row => toToolItem(row, maps));

    // Client-side sort — the API sorts by name only; brand/charge/status/date
    // sorting mirrors the old Firestore orderBy(filters.sortBy) behavior.
    if (filters?.sortBy && filters.sortBy !== 'name') {
      const sortBy = filters.sortBy;
      tools = [...tools].sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        if (typeof av === 'number' && typeof bv === 'number') return av - bv;
        return String(av).localeCompare(String(bv));
      });
      if (filters.sortOrder === 'desc') tools.reverse();
    } else if (filters?.sortOrder === 'desc') {
      tools.reverse();
    }

    // Apply search filter (client-side)
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      tools = tools.filter(tool =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description?.toLowerCase().includes(searchLower) ||
        tool.notes?.toLowerCase().includes(searchLower) ||
        tool.brand?.toLowerCase().includes(searchLower) ||
        tool.tradeName?.toLowerCase().includes(searchLower) ||
        tool.sectionName?.toLowerCase().includes(searchLower) ||
        tool.categoryName?.toLowerCase().includes(searchLower) ||
        tool.subcategoryName?.toLowerCase().includes(searchLower)
      );
    }

    return { success: true, data: tools };
  } catch (error) {
    console.error('Error getting tools:', error);
    return { success: false, error: errorMessage(error, 'Failed to fetch tools') };
  }
};

/**
 * Get tools by trade
 */
export const getToolsByTrade = async (
  userId: string,
  tradeId: string
): Promise<ToolResponse<ToolItem[]>> => {
  return getTools(userId, { tradeId, sortBy: 'name', sortOrder: 'asc' });
};

/**
 * Get available tools only
 */
export const getAvailableTools = async (
  userId: string
): Promise<ToolResponse<ToolItem[]>> => {
  return getTools(userId, { status: 'available', sortBy: 'name', sortOrder: 'asc' });
};
