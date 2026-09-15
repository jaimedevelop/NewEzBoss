import type { DatabaseResult } from './types';
import { listHierarchy, errorMessage, type HierarchyItemType } from './hierarchyApi';
import { buildHierarchyTree, type EditorHierarchyNode, type EditorLevel } from './hierarchyTree';

/** One cached, owner-scoped API request per level, independent of parent count. */
export async function loadEditorHierarchy(itemType: HierarchyItemType): Promise<EditorHierarchyNode[]> {
  const levels: EditorLevel[] = itemType === 'product'
    ? ['trade', 'section', 'category', 'subcategory', 'type', 'size']
    : itemType === 'labor' ? ['trade', 'section', 'category']
    : ['trade', 'section', 'category', 'subcategory'];
  const entries = await Promise.all(levels.map(async level => {
    try {
      return [level, await listHierarchy(level, level === 'trade' ? undefined : itemType)] as const;
    } catch (error) {
      throw new Error(`Failed to load ${level} rows: ${errorMessage(error, 'Please retry')}`);
    }
  }));
  return buildHierarchyTree(Object.fromEntries(entries));
}

export const getFullCategoryHierarchy = async (
  _userId: string
): Promise<DatabaseResult<EditorHierarchyNode[]>> => {
  try {
    return { success: true, data: await loadEditorHierarchy('product') };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to load categories') };
  }
};
