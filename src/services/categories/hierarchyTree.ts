import type { CategoryNode } from './types';

export type EditorLevel = CategoryNode['level'];
export const parentLevels: Partial<Record<EditorLevel, EditorLevel>> = {
  section: 'trade', category: 'section', subcategory: 'category', type: 'subcategory', size: 'trade',
};
const parentColumns: Partial<Record<EditorLevel, string>> = {
  section: 'tradeId', category: 'sectionId', subcategory: 'categoryId', type: 'subcategoryId', size: 'tradeId',
};
export const nodeKey = (node: { level: string; id: string }) => `${node.level}:${node.id}`;

export interface EditorHierarchyNode extends CategoryNode {
  tradeId?: string;
  sectionId?: string;
  categoryId?: string;
}
export interface TreeRow { id: string | number; name: string; [column: string]: unknown }

/** Parent maps are level-scoped because SQL tables have independent ID sequences. */
export function buildHierarchyTree(rows: Partial<Record<EditorLevel, TreeRow[]>>): EditorHierarchyNode[] {
  const nodes = new Map<string, EditorHierarchyNode>();
  const roots: EditorHierarchyNode[] = [];
  for (const level of ['trade', 'section', 'category', 'subcategory', 'type', 'size'] as const) {
    for (const row of rows[level] ?? []) {
      const parentColumn = parentColumns[level];
      const parentId = parentColumn ? String(row[parentColumn]) : undefined;
      const parentLevel = parentLevels[level];
      const parent = parentLevel ? nodes.get(`${parentLevel}:${parentId}`) : undefined;
      if (parentLevel && !parent) {
        throw new Error(`Cannot load ${level} "${row.name}": its ${parentLevel} is missing. Check migrated hierarchy relationships.`);
      }
      const node: EditorHierarchyNode = {
        id: String(row.id), name: row.name, level, parentId, children: [],
        productCount: 0, descendantCount: 0,
        tradeId: parent?.level === 'trade' ? parent.id : parent?.tradeId,
        sectionId: parent?.level === 'section' ? parent.id : parent?.sectionId,
        categoryId: parent?.level === 'category' ? parent.id : parent?.categoryId,
      };
      nodes.set(nodeKey(node), node);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  const count = (node: EditorHierarchyNode): number => {
    node.descendantCount = node.children.reduce((sum, child) => sum + 1 + count(child), 0);
    return node.descendantCount;
  };
  roots.forEach(count);
  return roots;
}
