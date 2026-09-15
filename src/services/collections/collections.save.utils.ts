import type { CategoryTab, CollectionContentType, ItemSelection } from './collections.types';
import type { CollectionSaveUpdates } from './collections.mutations';

export type CollectionSaveDrafts = Record<CollectionContentType, {
  tabs: CategoryTab[];
  selections: Record<string, ItemSelection>;
  savedTabs: CategoryTab[];
  savedSelections: Record<string, ItemSelection>;
  dirty: boolean;
}>;

const fields: Record<CollectionContentType, [keyof CollectionSaveUpdates, keyof CollectionSaveUpdates, keyof CollectionSaveUpdates]> = {
  products: ['productCategoryTabs', 'productSelections', 'productQuantityUpdates'],
  labor: ['laborCategoryTabs', 'laborSelections', 'laborQuantityUpdates'],
  tools: ['toolCategoryTabs', 'toolSelections', 'toolQuantityUpdates'],
  equipment: ['equipmentCategoryTabs', 'equipmentSelections', 'equipmentQuantityUpdates'],
};

const sameJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/** Returns deltas only when every selection differs solely by its quantity. */
const quantityOnlyChanges = (
  selections: Record<string, ItemSelection>,
  savedSelections: Record<string, ItemSelection>
): Record<string, number> | undefined => {
  const itemIds = Object.keys(selections);
  if (itemIds.length !== Object.keys(savedSelections).length) return undefined;
  const changes: Record<string, number> = {};
  for (const itemId of itemIds) {
    const current = selections[itemId];
    const saved = savedSelections[itemId];
    if (!saved) return undefined;
    // Zero is an unselected category member. It needs replacement sync so
    // the tombstone can be written along with the complete category state.
    if (current.quantity <= 0) return undefined;
    const { quantity: currentQuantity, ...currentRest } = current;
    const { quantity: savedQuantity, ...savedRest } = saved;
    if (!sameJson(currentRest, savedRest)) return undefined;
    if (currentQuantity !== savedQuantity) changes[itemId] = currentQuantity;
  }
  return Object.keys(changes).length ? changes : undefined;
};

/**
 * Produces only replacement-safe syncs. Each included type contains complete
 * tabs and selections, with only that type's pending tab deletions applied.
 */
export const buildDirtySyncUpdates = (
  drafts: CollectionSaveDrafts,
  pendingDeletions: Record<CollectionContentType, Set<string>>
): CollectionSaveUpdates => {
  const updates: CollectionSaveUpdates = {};
  (Object.keys(drafts) as CollectionContentType[]).forEach((contentType) => {
    const draft = drafts[contentType];
    const pending = pendingDeletions[contentType];
    if (!draft.dirty && pending.size === 0) return;
    const [tabsField, selectionsField, quantityField] = fields[contentType];
    // A quantity delta is safe only when neither tab membership nor any
    // selection metadata changed, and there are no pending tab deletions.
    const quantities = pending.size === 0 && sameJson(draft.tabs, draft.savedTabs)
      ? quantityOnlyChanges(draft.selections, draft.savedSelections)
      : undefined;
    if (quantities) {
      (updates as any)[quantityField] = quantities;
      return;
    }
    (updates as any)[tabsField] = draft.tabs.filter(tab => !pending.has(tab.id));
    (updates as any)[selectionsField] = Object.fromEntries(
      Object.entries(draft.selections).filter(([, selection]) => !pending.has(selection.categoryTabId))
    );
  });
  return updates;
};

export const saveErrorMessages = (
  failedContentTypes: Partial<Record<CollectionContentType, string>>,
  metadataError?: string
) => [...Object.values(failedContentTypes), ...(metadataError ? [metadataError] : [])];
