import type { CategorySelection, CollectionContentType } from '../collections/collections.types';
import { inventoryApiRequest } from './inventoryApi';

type SelectionPage = { items: { id: number }[]; nextAfterId: number | null; hasMore: boolean };

/** The desktop collection selector asks SQL for IDs; detail is fetched only for matches. */
export async function getInventorySelectionIds(
  kind: CollectionContentType, selection: CategorySelection, maxItems?: number,
): Promise<string[]> {
  const ids: string[] = [];
  let afterId = 0;
  do {
    const page = await inventoryApiRequest<SelectionPage>(`/inventory/selection/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ selection, afterId, limit: maxItems ? Math.min(maxItems - ids.length, 500) : 500 }),
    });
    ids.push(...page.items.map(row => String(row.id)));
    if (!page.hasMore || !page.nextAfterId || (maxItems && ids.length >= maxItems)) break;
    afterId = page.nextAfterId;
  } while (true);
  return ids;
}

export async function inventorySelectionHasItems(kind: CollectionContentType, selection: CategorySelection): Promise<boolean> {
  return (await getInventorySelectionIds(kind, selection, 1)).length > 0;
}
