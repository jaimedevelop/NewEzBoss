// src/services/categories/hierarchyApi.ts
//
// Shared helpers for the category hierarchy services (trades/sections/categories/
// subcategories/types/sizes). All of these now live in Postgres behind
// /inventory/categories on the API instead of per-level Firestore collections.
import { inventoryApiRequest, ApiError } from '../inventory/inventoryApi';
import { DatabaseResult } from './types';

export type HierarchyLevel = 'trade' | 'section' | 'category' | 'subcategory' | 'type' | 'size';

// trade is the one level shared across item types; every other level is scoped to a
// single item type (a category created while adding a Tool is not selectable for
// Products/Equipment/Labor, matching each type's original separate Firestore collection).
export type HierarchyItemType = 'product' | 'tool' | 'equipment' | 'labor';

export interface HierarchyRow {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  [parentCol: string]: unknown;
}

// Postgres ids are integers; every consumer of these services expects string ids
// (Firestore doc ids), so every row crossing this boundary gets its id stringified.
export function stringifyRow<T extends { id: unknown }>(row: T): T & { id: string } {
  return { ...row, id: String(row.id) };
}

export async function listHierarchy(
  level: HierarchyLevel,
  itemType: HierarchyItemType | undefined,
  parentId?: string
): Promise<HierarchyRow[]> {
  const params = new URLSearchParams();
  if (parentId) params.set('parentId', parentId);
  if (level !== 'trade' && itemType) params.set('itemType', itemType);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return inventoryApiRequest<HierarchyRow[]>(`/inventory/categories/hierarchy/${level}${qs}`);
}

export async function createHierarchyNode(
  level: HierarchyLevel,
  itemType: HierarchyItemType | undefined,
  name: string,
  parentId?: string
): Promise<HierarchyRow> {
  return inventoryApiRequest<HierarchyRow>(`/inventory/categories/hierarchy/${level}`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      parentId: parentId ? Number(parentId) : undefined,
      ...(level !== 'trade' && itemType ? { itemType } : {}),
    }),
  });
}

export async function renameHierarchyNode(
  level: HierarchyLevel,
  id: string,
  name: string
): Promise<HierarchyRow> {
  return inventoryApiRequest<HierarchyRow>(`/inventory/categories/hierarchy/${level}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteHierarchyNode(level: HierarchyLevel, id: string): Promise<void> {
  await inventoryApiRequest<void>(`/inventory/categories/hierarchy/${level}/${id}`, {
    method: 'DELETE',
  });
}

export interface HierarchyUsage {
  descendantCounts: Record<HierarchyLevel, number>;
  itemCounts: Record<string, number>;
}

export async function getHierarchyUsage(level: HierarchyLevel, id: string): Promise<HierarchyUsage> {
  return inventoryApiRequest<HierarchyUsage>(`/inventory/categories/hierarchy/${level}/${id}/usage`);
}

export function totalItemCount(usage: HierarchyUsage): number {
  return Object.values(usage.itemCounts).reduce((sum, n) => sum + n, 0);
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function asDatabaseResult<T>(data: T): DatabaseResult<T> {
  return { success: true, data };
}

export function asDatabaseError(error: unknown, fallback: string): DatabaseResult<never> {
  return { success: false, error: errorMessage(error, fallback) };
}
