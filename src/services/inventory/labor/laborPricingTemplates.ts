// src/services/inventory/labor/laborPricingTemplates.ts
// Reusable client pricing templates for labor items — backed by the
// laborPricingTemplates table in Postgres via /inventory/labor-pricing-templates.
import { inventoryApiRequest, ApiError } from '../inventoryApi';
import { listHierarchy } from '../../categories/hierarchyApi';
import type { PricingProfile } from './labor.types';

export interface PricingTemplate {
  id: string;
  name: string;
  description: string;
  profiles: PricingProfile[];
  tradeId?: string;
  tradeName?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

interface TemplateRow {
  id: number;
  name: string;
  description: string | null;
  tradeId: number | null;
  sectionId: number | null;
  categoryId: number | null;
  profiles: PricingProfile[];
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface Response<T> {
  success: boolean;
  data?: T;
  error?: string;
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
  const nameById = (rows: { id: number; name: string }[]) => new Map(rows.map((r) => [r.id, r.name]));
  const idByName = (rows: { id: number; name: string }[], name: string | undefined) => {
    if (!name || !name.trim()) return null;
    const match = rows.find((r) => r.name.toLowerCase() === name.trim().toLowerCase());
    return match ? match.id : null;
  };
  return {
    tradeNames: nameById(trades),
    sectionNames: nameById(sections),
    categoryNames: nameById(categories),
    tradeId: (name: string | undefined) => idByName(trades, name),
    sectionId: (name: string | undefined) => idByName(sections, name),
    categoryId: (name: string | undefined) => idByName(categories, name),
  };
}

function toTemplate(row: TemplateRow, maps: Awaited<ReturnType<typeof buildNameMaps>>): PricingTemplate {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    profiles: row.profiles ?? [],
    tradeId: row.tradeId ? String(row.tradeId) : undefined,
    tradeName: row.tradeId ? maps.tradeNames.get(row.tradeId) : undefined,
    sectionId: row.sectionId ? String(row.sectionId) : undefined,
    sectionName: row.sectionId ? maps.sectionNames.get(row.sectionId) : undefined,
    categoryId: row.categoryId ? String(row.categoryId) : undefined,
    categoryName: row.categoryId ? maps.categoryNames.get(row.categoryId) : undefined,
    userId: String(row.userId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get all pricing templates for the current user
 */
export const getPricingTemplates = async (): Promise<Response<PricingTemplate[]>> => {
  try {
    const [rows, maps] = await Promise.all([
      inventoryApiRequest<TemplateRow[]>('/inventory/labor-pricing-templates'),
      buildNameMaps(),
    ]);
    return { success: true, data: rows.map((r) => toTemplate(r, maps)) };
  } catch (error) {
    console.error('Error fetching pricing templates:', error);
    return { success: false, error: errorMessage(error, 'Failed to load templates') };
  }
};

export interface PricingTemplateInput {
  name: string;
  description?: string;
  profiles: PricingProfile[];
  tradeId?: string;
  tradeName?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
}

async function toApiBody(input: PricingTemplateInput) {
  const maps = await buildNameMaps();
  return {
    name: input.name,
    description: input.description,
    tradeId: input.tradeId ? Number(input.tradeId) : maps.tradeId(input.tradeName) ?? undefined,
    sectionId: input.sectionId ? Number(input.sectionId) : maps.sectionId(input.sectionName) ?? undefined,
    categoryId: input.categoryId ? Number(input.categoryId) : maps.categoryId(input.categoryName) ?? undefined,
    profiles: input.profiles,
  };
}

/**
 * Create a new pricing template
 */
export const createPricingTemplate = async (
  input: PricingTemplateInput
): Promise<Response<PricingTemplate>> => {
  try {
    const [body, maps] = await Promise.all([toApiBody(input), buildNameMaps()]);
    const row = await inventoryApiRequest<TemplateRow>('/inventory/labor-pricing-templates', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { success: true, data: toTemplate(row, maps) };
  } catch (error) {
    console.error('Error creating pricing template:', error);
    return { success: false, error: errorMessage(error, 'Failed to save template') };
  }
};

/**
 * Update an existing pricing template
 */
export const updatePricingTemplate = async (
  id: string,
  input: PricingTemplateInput
): Promise<Response<PricingTemplate>> => {
  try {
    const [body, maps] = await Promise.all([toApiBody(input), buildNameMaps()]);
    const row = await inventoryApiRequest<TemplateRow>(`/inventory/labor-pricing-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return { success: true, data: toTemplate(row, maps) };
  } catch (error) {
    console.error('Error updating pricing template:', error);
    return { success: false, error: errorMessage(error, 'Failed to save template') };
  }
};

/**
 * Delete a pricing template
 */
export const deletePricingTemplate = async (id: string): Promise<Response<void>> => {
  try {
    await inventoryApiRequest<void>(`/inventory/labor-pricing-templates/${id}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting pricing template:', error);
    return { success: false, error: errorMessage(error, 'Failed to delete template') };
  }
};
