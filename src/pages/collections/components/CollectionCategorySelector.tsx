import { loadEditorHierarchy } from '../../../services/categories/hierarchy';
import type { EditorHierarchyNode } from '../../../services/categories/hierarchyTree';
import BusinessActionButton from '../../../mainComponents/ui/BusinessActionButton';
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  Layers,
  Plus,
  Package,
  Briefcase,
  Wrench,
  Truck
} from 'lucide-react';

// Product categories
import {
  getProductSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes,
  addProductTrade,
  addProductSection,
  addProductCategory,
  addProductSubcategory,
  addProductType
} from '../../../services/categories';

// Labor categories
import {
  getSections as getLaborSections,
  addSection as addLaborSection,
} from '../../../services/inventory/labor/sections';
import {
  getCategories as getLaborCategories,
  addCategory as addLaborCategory,
} from '../../../services/inventory/labor/categories';

// Tool categories
import {
  getToolSections,
  addToolSection,
} from '../../../services/inventory/tools/sections';
import {
  getToolCategories,
  addToolCategory,
} from '../../../services/inventory/tools/categories';
import {
  getToolSubcategories,
  addToolSubcategory,
} from '../../../services/inventory/tools/subcategories';

// Equipment categories
import {
  getEquipmentSections,
  addEquipmentSection,
} from '../../../services/inventory/equipment/sections';
import {
  getEquipmentCategories,
  addEquipmentCategory,
} from '../../../services/inventory/equipment/categories';
import {
  getEquipmentSubcategories,
  addEquipmentSubcategory,
} from '../../../services/inventory/equipment/subcategories';

import { useAuthContext } from '../../../contexts/AuthContext';
import type { CollectionContentType } from '../../../services/collections';
import { inventorySelectionHasItems } from '../../../services/inventory/selection';
import EmptyCategoryWarning from './EmptyCategoryWarning';

interface CollectionCategorySelectorProps {
  collectionName: string;
  contentType: CollectionContentType;
  initialSelection?: CategorySelection;
  onComplete?: (selectedCategories: CategorySelection) => void;
  onClose?: () => void;
  userId: string;
}

interface HierarchicalCategoryItem {
  name: string;
  tradeId?: string;
  tradeName?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
}

export interface CategorySelection {
  collectionName?: string;
  trade?: string;
  tradeId?: string;
  sections: HierarchicalCategoryItem[];
  categories: HierarchicalCategoryItem[];
  subcategories: HierarchicalCategoryItem[];
  types?: HierarchicalCategoryItem[];
}

interface CategoryNode {
  id: string;
  name: string;
  level: 'trade' | 'section' | 'category' | 'subcategory' | 'type';
  parentId?: string;
  children?: CategoryNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
}

// IDs are unique within a hierarchy table, not across levels.
const nodeKey = (node: Pick<CategoryNode, 'level' | 'id'>): string => `${node.level}:${node.id}`;
const parentLevels: Partial<Record<CategoryNode['level'], CategoryNode['level']>> = {
  section: 'trade', category: 'section', subcategory: 'category', type: 'subcategory'
};
const parentKey = (node: CategoryNode): string | undefined => {
  const level = parentLevels[node.level];
  return level && node.parentId ? nodeKey({ level, id: node.parentId }) : undefined;
};

const searchCategoryTree = (nodes: CategoryNode[], query: string) => {
  const matchedNodeIds = new Set<string>();
  const pathsToExpand = new Set<string>();
  const term = query.trim().toLowerCase();
  if (term) {
    const visit = (items: CategoryNode[], path: string[] = []) => {
      items.forEach(node => {
        if (node.name.toLowerCase().includes(term)) {
          matchedNodeIds.add(nodeKey(node));
          path.forEach(key => pathsToExpand.add(key));
        }
        visit(node.children || [], [...path, nodeKey(node)]);
      });
    };
    visit(nodes);
  }
  return { matchedNodeIds, pathsToExpand };
};

const CollectionCategorySelector: React.FC<CollectionCategorySelectorProps> = ({
  collectionName,
  contentType,
  initialSelection,
  onComplete,
  onClose,
  userId,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const isSearching = Boolean(searchQuery.trim());
  const searchResults = useMemo(() => searchCategoryTree(categoryTree, searchQuery), [categoryTree, searchQuery]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [addingNewItem, setAddingNewItem] = useState<{ level: CategoryNode['level']; parentId?: string; parentName?: string } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [collectionTitle, setCollectionTitle] = useState(initialSelection?.collectionName || collectionName || 'New Collection');

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<CategorySelection | null>(null);
  const [emptyCategories, setEmptyCategories] = useState<HierarchicalCategoryItem[]>([]);

  const { currentUser } = useAuthContext();

  const getMaxLevel = (): CategoryNode['level'] => {
    switch (contentType) {
      case 'labor': return 'category';
      case 'tools':
      case 'equipment': return 'subcategory';
      case 'products':
      default: return 'type';
    }
  };

  const getContentTypeInfo = () => {
    switch (contentType) {
      case 'products': return { icon: Package, label: 'Products', color: 'blue' };
      case 'labor': return { icon: Briefcase, label: 'Labor', color: 'purple' };
      case 'tools': return { icon: Wrench, label: 'Tools', color: 'orange' };
      case 'equipment': return { icon: Truck, label: 'Equipment', color: 'green' };
      default: return { icon: Package, label: 'Products', color: 'blue' };
    }
  };

  const { icon: ContentIcon, label: contentLabel } = getContentTypeInfo();

  useEffect(() => {
    if (userId) {
      loadTrades();
    } else {
      setError('User not authenticated');
      setIsLoading(false);
    }
  }, [userId, contentType]);

  const loadTrades = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tree = await loadEditorHierarchy(({ products: 'product', labor: 'labor', tools: 'tool', equipment: 'equipment' } as const)[contentType]);
      const toNodes = (nodes: EditorHierarchyNode[]): CategoryNode[] => nodes
        .filter(node => node.level !== 'size')
        .map(node => ({
          id: node.id,
          name: node.name,
          level: node.level as CategoryNode['level'],
          parentId: node.parentId,
          isExpanded: false,
          children: toNodes(node.children),
        }));
      setCategoryTree(toNodes(tree));
    } catch (err) {
      setError('Error loading categories');
      console.error('Error in loadTrades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getChildLevel = (parentLevel: string): CategoryNode['level'] => {
    if (contentType === 'labor') {
      const map: Record<string, CategoryNode['level']> = { trade: 'section', section: 'category' };
      return map[parentLevel] || 'category';
    } else if (contentType === 'tools' || contentType === 'equipment') {
      const map: Record<string, CategoryNode['level']> = { trade: 'section', section: 'category', category: 'subcategory' };
      return map[parentLevel] || 'subcategory';
    } else {
      const map: Record<string, CategoryNode['level']> = { trade: 'section', section: 'category', category: 'subcategory', subcategory: 'type' };
      return map[parentLevel] || 'type';
    }
  };

  const loadChildrenData = async (node: CategoryNode): Promise<CategoryNode[]> => {
    try {
      let result: any;

      switch (contentType) {
        case 'products':
          switch (node.level) {
            case 'trade': result = await getProductSections(node.id, userId); break;
            case 'section': result = await getProductCategories(node.id, userId); break;
            case 'category': result = await getProductSubcategories(node.id, userId); break;
            case 'subcategory': result = await getProductTypes(node.id, userId); break;
            default: return [];
          }
          break;
        case 'labor':
          switch (node.level) {
            case 'trade': result = await getLaborSections(node.id, userId); break;
            case 'section': result = await getLaborCategories(node.id, userId); break;
            default: return [];
          }
          break;
        case 'tools':
          switch (node.level) {
            case 'trade': result = await getToolSections(node.id, userId); break;
            case 'section': result = await getToolCategories(node.id, userId); break;
            case 'category': result = await getToolSubcategories(node.id, userId); break;
            default: return [];
          }
          break;
        case 'equipment':
          switch (node.level) {
            case 'trade': result = await getEquipmentSections(node.id, userId); break;
            case 'section': result = await getEquipmentCategories(node.id, userId); break;
            case 'category': result = await getEquipmentSubcategories(node.id, userId); break;
            default: return [];
          }
          break;
      }

      if (result?.success && result.data) {
        const childLevel = getChildLevel(node.level);
        return result.data.map((item: any) => ({
          id: String(item.id || ''),
          name: item.name,
          level: childLevel,
          parentId: node.id,
          isExpanded: false,
          children: []
        }));
      }
      throw new Error(result?.error || `Failed to load children for ${node.name}`);
    } catch (err) {
      console.error('Error loading children for', node.name + ':', err);
      throw err;
    }
  };

  const getAllDescendantIdsRecursive = async (node: CategoryNode): Promise<string[]> => {
    let allIds = [nodeKey(node)];
    const maxLevel = getMaxLevel();
    if (node.level === maxLevel) return allIds;

    let children = node.children || [];
    if (children.length === 0) {
      children = await loadChildrenData(node);
      if (children.length > 0) updateNodeChildren(node, children);
    }

    if (children.length > 0) {
      const results = await Promise.all(children.map(c => getAllDescendantIdsRecursive(c)));
      results.forEach(ids => { allIds = [...allIds, ...ids]; });
    }
    return allIds;
  };

  const updateNodeChildren = (node: CategoryNode, children: CategoryNode[]) => {
    const update = (nodes: CategoryNode[]): CategoryNode[] =>
      nodes.map(n => {
        if (nodeKey(n) === nodeKey(node)) {
          // Refresh siblings without discarding already loaded descendants or expansion.
          const existing = new Map(n.children?.map(child => [nodeKey(child), child]));
          return { ...n, children: children.map(child => existing.get(nodeKey(child)) || child), isLoading: false, isExpanded: true };
        }
        if (n.children) return { ...n, children: update(n.children) };
        return n;
      });
    setCategoryTree(prev => update(prev));
  };

  const toggleExpand = async (node: CategoryNode) => {
    const updateExpansion = (nodes: CategoryNode[]): CategoryNode[] =>
      nodes.map(n => {
        if (nodeKey(n) === nodeKey(node)) {
          const newExpanded = !n.isExpanded;
          return { ...n, isExpanded: newExpanded, isLoading: newExpanded && (!n.children || n.children.length === 0) };
        }
        if (n.children) return { ...n, children: updateExpansion(n.children) };
        return n;
      });
    setCategoryTree(prev => updateExpansion(prev));

    if (!node.isExpanded && (!node.children || node.children.length === 0)) {
      try {
        const children = await loadChildrenData(node);
        updateNodeChildren(node, children);
      } catch {
        setError(`Failed to load children for ${node.name}. Please try again.`);
        const reset = (nodes: CategoryNode[]): CategoryNode[] => nodes.map(n =>
          nodeKey(n) === nodeKey(node)
            ? { ...n, isLoading: false, isExpanded: false }
            : { ...n, children: n.children ? reset(n.children) : undefined }
        );
        setCategoryTree(prev => reset(prev));
      }
    }
  };

  const getAllDescendantIds = (node: CategoryNode): string[] => {
    let ids = [nodeKey(node)];
    if (node.children?.length) {
      node.children.forEach(c => { ids = [...ids, ...getAllDescendantIds(c)]; });
    }
    return ids;
  };

  const toggleSelect = async (node: CategoryNode) => {
    const deselect = selectedItems.has(nodeKey(node));
    try {
      const keys = deselect ? getAllDescendantIds(node) : await getAllDescendantIdsRecursive(node);
      setSelectedItems(prev => {
        const next = new Set(prev);
        keys.forEach(key => deselect ? next.delete(key) : next.add(key));
        if (deselect) {
          // A selected ancestor represents its entire branch when saved. Once
          // a descendant is excluded, keep only the remaining checked branches.
          const nodeMap = buildNodeMap();
          let ancestorKey = parentKey(node);
          while (ancestorKey) {
            next.delete(ancestorKey);
            const ancestor = nodeMap.get(ancestorKey);
            ancestorKey = ancestor ? parentKey(ancestor) : undefined;
          }
        }
        return next;
      });
    } catch {
      setError(`Failed to select ${node.name}. Please try again.`);
    }
  };

  // ─── Helpers for tree traversal ─────────────────────────────────────────────

  const findNodeInTree = (node: CategoryNode, nodes: CategoryNode[]): boolean => {
    for (const n of nodes) {
      if (nodeKey(n) === nodeKey(node)) return true;
      if (n.children && findNodeInTree(node, n.children)) return true;
    }
    return false;
  };

  const findNode = (nodes: CategoryNode[], id: string, level: CategoryNode['level']): CategoryNode | null => {
    for (const n of nodes) {
      if (n.id === id && n.level === level) return n;
      if (n.children) {
        const found = findNode(n.children, id, level);
        if (found) return found;
      }
    }
    return null;
  };

  // ─── Build selection from checked nodes ─────────────────────────────────────

  /**
   * Build a flat map of every node in the tree keyed by level and ID.
   */
  const buildNodeMap = (): Map<string, CategoryNode> => {
    const map = new Map<string, CategoryNode>();
    const walk = (nodes: CategoryNode[]) => {
      nodes.forEach(n => {
        map.set(nodeKey(n), n);
        if (n.children?.length) walk(n.children);
      });
    };
    walk(categoryTree);
    return map;
  };

  /**
   * Resolve each parent using its expected level so overlapping IDs cannot
   * overwrite ancestors or introduce cycles in the parent chain.
   */
  const getAncestorChainFromMap = (
    node: CategoryNode,
    nodeMap: Map<string, CategoryNode>
  ): { trade: CategoryNode | null; section: CategoryNode | null; category: CategoryNode | null; subcategory: CategoryNode | null } => {
    const chain: { trade: CategoryNode | null; section: CategoryNode | null; category: CategoryNode | null; subcategory: CategoryNode | null } =
      { trade: null, section: null, category: null, subcategory: null };

    let current: CategoryNode | undefined = node;
    while (current) {
      const key = parentKey(current);
      const parent = key ? nodeMap.get(key) : undefined;
      if (!parent) break;
      chain[parent.level as keyof typeof chain] = parent;
      current = parent;
    }

    return chain;
  };

  /**
   * Only emit a node if its parent is NOT in selectedItems.
   * This ensures we emit the highest-level selected node per branch,
   * not redundant child nodes.
   */
  const buildSelection = (): CategorySelection => {
    const selection: CategorySelection = {
      trade: '',
      tradeId: '',
      sections: [],
      categories: [],
      subcategories: [],
      types: []
    };

    const selectedTrades = new Set<string>();
    const selectedTradeIds = new Set<string>();
    const nodeMap = buildNodeMap();

    selectedItems.forEach(id => {
      const node = nodeMap.get(id);
      if (!node) return;

      // If the parent is also selected, skip this node — the parent covers it.
      const key = parentKey(node);
      if (key && selectedItems.has(key)) return;

      const chain = getAncestorChainFromMap(node, nodeMap);
      const tradeNode = chain.trade;
      const sectionNode = chain.section;
      const categoryNode = chain.category;
      const subcategoryNode = chain.subcategory;

      if (tradeNode) {
        selectedTrades.add(tradeNode.name);
        selectedTradeIds.add(tradeNode.id);
      }

      switch (node.level) {
        case 'trade':
          selectedTrades.add(node.name);
          selectedTradeIds.add(node.id);
          if (!selection.trade) {
            selection.trade = node.name;
            selection.tradeId = node.id;
          }
          break;

        case 'section':
          selection.sections.push({
            name: node.name,
            sectionId: node.id,
            // For a section node, the trade IS its direct parent
            tradeId: node.parentId || tradeNode?.id,
            tradeName: tradeNode?.name,
          });
          break;

        case 'category':
          selection.categories.push({
            name: node.name,
            categoryId: node.id,
            sectionId: sectionNode?.id || node.parentId,
            sectionName: sectionNode?.name,
            tradeId: tradeNode?.id,
            tradeName: tradeNode?.name,
          });
          break;

        case 'subcategory':
          selection.subcategories.push({
            name: node.name,
            subcategoryId: node.id,
            categoryId: categoryNode?.id || node.parentId,
            categoryName: categoryNode?.name,
            sectionId: sectionNode?.id,
            sectionName: sectionNode?.name,
            tradeId: tradeNode?.id,
            tradeName: tradeNode?.name,
          });
          break;

        case 'type':
          if (!selection.types) selection.types = [];
          selection.types.push({
            name: node.name,
            subcategoryId: subcategoryNode?.id || node.parentId,
            subcategoryName: subcategoryNode?.name,
            categoryId: categoryNode?.id,
            categoryName: categoryNode?.name,
            sectionId: sectionNode?.id,
            sectionName: sectionNode?.name,
            tradeId: tradeNode?.id,
            tradeName: tradeNode?.name,
          });
          break;
      }
    });

    if (!selection.trade && selectedTrades.size > 0) {
      selection.trade = Array.from(selectedTrades)[0];
      selection.tradeId = Array.from(selectedTradeIds)[0];
    }

    return selection;
  };

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validateHasItems = async (
    selection: CategorySelection
  ): Promise<{ hasItems: boolean; emptyCategories: HierarchicalCategoryItem[] }> => {
    const emptyCats: HierarchicalCategoryItem[] = [];

    const checkHasItems = async (singleItemSelection: CategorySelection): Promise<boolean> => {
      return inventorySelectionHasItems(contentType, singleItemSelection);
    };

    const checks: Array<{ item: HierarchicalCategoryItem; sel: CategorySelection }> = [];

    selection.sections.forEach(s => checks.push({
      item: s,
      sel: { trade: selection.trade, tradeId: selection.tradeId, sections: [s], categories: [], subcategories: [], types: [] }
    }));
    selection.categories.forEach(c => checks.push({
      item: c,
      sel: { trade: selection.trade, tradeId: selection.tradeId, sections: [], categories: [c], subcategories: [], types: [] }
    }));
    selection.subcategories.forEach(sc => checks.push({
      item: sc,
      sel: { trade: selection.trade, tradeId: selection.tradeId, sections: [], categories: [], subcategories: [sc], types: [] }
    }));
    (selection.types || []).forEach(t => checks.push({
      item: t,
      sel: { trade: selection.trade, tradeId: selection.tradeId, sections: [], categories: [], subcategories: [], types: [t] }
    }));

    for (const { item, sel } of checks) {
      const hasItems = await checkHasItems(sel);
      if (!hasItems) emptyCats.push(item);
    }

    return { hasItems: emptyCats.length === 0, emptyCategories: emptyCats };
  };

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleApply = async () => {
    const selection = buildSelection();

    if (!selection.trade &&
      selection.sections.length === 0 &&
      selection.categories.length === 0 &&
      selection.subcategories.length === 0 &&
      (selection.types?.length ?? 0) === 0) {
      setError('Please select at least one category');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const { emptyCategories: empty } = await validateHasItems(selection);
      if (empty.length > 0) {
        setPendingSelection(selection);
        setEmptyCategories(empty);
        setShowEmptyWarning(true);
        setIsValidating(false);
        return;
      }
      onComplete?.(selection);
    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate selection. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceedAnyway = () => {
    if (pendingSelection && onComplete) {
      onComplete(pendingSelection);
    }
    setShowEmptyWarning(false);
    setPendingSelection(null);
    setEmptyCategories([]);
    onClose?.();
  };

  const handleCancelWarning = () => {
    setShowEmptyWarning(false);
    setPendingSelection(null);
    setEmptyCategories([]);
  };

  const clearAll = () => setSelectedItems(new Set());

  const handleAddNewItem = async () => {
    if (!newItemName.trim() || !addingNewItem) return;

    try {
      let result: any;

      switch (contentType) {
        case 'products':
          switch (addingNewItem.level) {
            case 'trade':
              result = await addProductTrade(newItemName, userId);
              if (result.success) await loadTrades();
              break;
            case 'section':
              if (addingNewItem.parentId) {
                result = await addProductSection(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const n = categoryTree.find(t => t.id === addingNewItem.parentId);
                  if (n) updateNodeChildren(n, await loadChildrenData(n));
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                result = await addProductCategory(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const n = findNode(categoryTree, addingNewItem.parentId, 'section');
                  if (n) updateNodeChildren(n, await loadChildrenData(n));
                }
              }
              break;
            case 'subcategory':
              if (addingNewItem.parentId) {
                result = await addProductSubcategory(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const n = findNode(categoryTree, addingNewItem.parentId, 'category');
                  if (n) updateNodeChildren(n, await loadChildrenData(n));
                }
              }
              break;
            case 'type':
              if (addingNewItem.parentId) {
                result = await addProductType(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const n = findNode(categoryTree, addingNewItem.parentId, 'subcategory');
                  if (n) updateNodeChildren(n, await loadChildrenData(n));
                }
              }
              break;
          }
          break;

        case 'labor':
          switch (addingNewItem.level) {
            case 'trade':
              result = await addProductTrade(newItemName, userId);
              if (result.success) await loadTrades();
              break;
            case 'section':
              if (addingNewItem.parentId) {
                result = await addLaborSection(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const n = categoryTree.find(t => t.id === addingNewItem.parentId);
                  if (n) updateNodeChildren(n, await loadChildrenData(n));
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                const sectionNode = findNode(categoryTree, addingNewItem.parentId, 'section');
                if (sectionNode) {
                  const tradeNode = categoryTree.find(t =>
                    t.level === 'trade' && findNodeInTree(sectionNode, t.children || [])
                  );
                  if (tradeNode) {
                    result = await addLaborCategory(newItemName, sectionNode.id, tradeNode.id, userId);
                    if (result.success) updateNodeChildren(sectionNode, await loadChildrenData(sectionNode));
                  }
                }
              }
              break;
          }
          break;

        case 'tools':
          switch (addingNewItem.level) {
            case 'trade':
              result = await addProductTrade(newItemName, userId);
              if (result.success) await loadTrades();
              break;
            case 'section':
              if (addingNewItem.parentId) {
                result = await addToolSection(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const n = categoryTree.find(t => t.id === addingNewItem.parentId);
                  if (n) updateNodeChildren(n, await loadChildrenData(n));
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                const sectionNode = findNode(categoryTree, addingNewItem.parentId, 'section');
                if (sectionNode) {
                  const tradeNode = categoryTree.find(t =>
                    t.level === 'trade' && findNodeInTree(sectionNode, t.children || [])
                  );
                  if (tradeNode) {
                    result = await addToolCategory(newItemName, sectionNode.id, tradeNode.id, userId);
                    if (result.success) updateNodeChildren(sectionNode, await loadChildrenData(sectionNode));
                  }
                }
              }
              break;
            case 'subcategory':
              if (addingNewItem.parentId) {
                const catNode = findNode(categoryTree, addingNewItem.parentId, 'category');
                if (catNode?.parentId) {
                  const sectionNode = findNode(categoryTree, catNode.parentId, 'section');
                  if (sectionNode) {
                    const tradeNode = categoryTree.find(t =>
                      t.level === 'trade' && findNodeInTree(sectionNode, t.children || [])
                    );
                    if (tradeNode) {
                      result = await addToolSubcategory(newItemName, catNode.id, sectionNode.id, tradeNode.id, userId);
                      if (result.success) updateNodeChildren(catNode, await loadChildrenData(catNode));
                    }
                  }
                }
              }
              break;
          }
          break;

        case 'equipment':
          switch (addingNewItem.level) {
            case 'trade':
              result = await addProductTrade(newItemName, userId);
              if (result.success) await loadTrades();
              break;
            case 'section':
              if (addingNewItem.parentId) {
                result = await addEquipmentSection(newItemName, addingNewItem.parentId, userId);
                if (result.success) {
                  const n = categoryTree.find(t => t.id === addingNewItem.parentId);
                  if (n) updateNodeChildren(n, await loadChildrenData(n));
                }
              }
              break;
            case 'category':
              if (addingNewItem.parentId) {
                const sectionNode = findNode(categoryTree, addingNewItem.parentId, 'section');
                if (sectionNode) {
                  const tradeNode = categoryTree.find(t =>
                    t.level === 'trade' && findNodeInTree(sectionNode, t.children || [])
                  );
                  if (tradeNode) {
                    result = await addEquipmentCategory(newItemName, sectionNode.id, tradeNode.id, userId);
                    if (result.success) updateNodeChildren(sectionNode, await loadChildrenData(sectionNode));
                  }
                }
              }
              break;
            case 'subcategory':
              if (addingNewItem.parentId) {
                const catNode = findNode(categoryTree, addingNewItem.parentId, 'category');
                if (catNode?.parentId) {
                  const sectionNode = findNode(categoryTree, catNode.parentId, 'section');
                  if (sectionNode) {
                    const tradeNode = categoryTree.find(t =>
                      t.level === 'trade' && findNodeInTree(sectionNode, t.children || [])
                    );
                    if (tradeNode) {
                      result = await addEquipmentSubcategory(newItemName, catNode.id, sectionNode.id, tradeNode.id, userId);
                      if (result.success) updateNodeChildren(catNode, await loadChildrenData(catNode));
                    }
                  }
                }
              }
              break;
          }
          break;
      }

      if (!result?.success) {
        setError(result?.error || 'Failed to add category. Please try again.');
        return;
      }
      setNewItemName('');
    } catch (err) {
      setError('Could not finish adding or refreshing categories. Please reopen the branch to check before retrying.');
      console.error('Error adding new item:', err);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const getSelectionCounts = () => {
    let trades = 0, sections = 0, categories = 0, subcategories = 0, types = 0;
    const count = (nodes: CategoryNode[]) => {
      nodes.forEach(n => {
        if (selectedItems.has(nodeKey(n))) {
          switch (n.level) {
            case 'trade': trades++; break;
            case 'section': sections++; break;
            case 'category': categories++; break;
            case 'subcategory': subcategories++; break;
            case 'type': types++; break;
          }
        }
        if (n.children) count(n.children);
      });
    };
    count(categoryTree);
    return { trades, sections, categories, subcategories, types };
  };

  const renderNode = (node: CategoryNode, depth: number = 0) => {
    const maxLevel = getMaxLevel();
    const canHaveChildren = node.level !== maxLevel;
    const hasChildren = canHaveChildren && Boolean(node.children?.length);
    const isSelected = selectedItems.has(nodeKey(node));
    const isMatched = searchResults.matchedNodeIds.has(nodeKey(node));
    const isSearchPath = searchResults.pathsToExpand.has(nodeKey(node));
    if (isSearching && !isMatched && !isSearchPath) return null;
    const isExpanded = isSearching ? isSearchPath || node.isExpanded : node.isExpanded;

    const levelColors = {
      trade: 'text-orange-600 bg-orange-50 border-orange-500',
      section: 'text-blue-600 bg-blue-50 border-blue-500',
      category: 'text-purple-600 bg-purple-50 border-purple-500',
      subcategory: 'text-green-600 bg-green-50 border-green-500',
      type: 'text-gray-600 bg-gray-50 border-gray-500'
    };
    const levelLabels = {
      trade: 'Trade', section: 'Section', category: 'Category',
      subcategory: 'Subcategory', type: 'Type'
    };

    return (
      <div key={nodeKey(node)}>
        <div
          className={`
            flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors
            ${isExpanded ? 'bg-gray-50' : ''}
            ${isSelected ? 'border-l-4 ' + levelColors[node.level].split(' ')[2] : ''}
          `}
          style={{ paddingLeft: `${(depth * 24) + 12}px` }}
        >
          <div className="flex items-center flex-1" onClick={() => hasChildren && toggleExpand(node)}>
            {hasChildren ? (
              <ChevronRight className={`w-4 h-4 mr-2 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            ) : (
              <span className="w-4 mr-2" />
            )}
            <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'} ${isSearching && isMatched ? 'bg-yellow-100 rounded px-1' : ''}`}>
              {node.name}
            </span>
            {node.isLoading && <Loader2 className="w-3 h-3 ml-2 animate-spin text-gray-400" />}
          </div>

          <div className="flex items-center gap-2">
            {canHaveChildren && !hasChildren && (
              <button
                type="button"
                aria-label={`Add ${getChildLevel(node.level)} to ${node.name}`}
                title={`Add ${getChildLevel(node.level)}`}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                onClick={() => {
                  setAddingNewItem({ level: getChildLevel(node.level), parentId: node.id, parentName: node.name });
                  setNewItemName('');
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(node)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
              onClick={e => e.stopPropagation()}
            />
            <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[node.level].split(' ').slice(0, 2).join(' ')}`}>
              {levelLabels[node.level]}
            </span>
          </div>
        </div>

        {isExpanded && (
          <>
            {node.children?.map(child => renderNode(child, depth + 1))}
            {canHaveChildren && (
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-blue-600"
                style={{ paddingLeft: `${((depth + 1) * 24) + 12}px` }}
                onClick={() => {
                  setAddingNewItem({ level: getChildLevel(node.level), parentId: node.id, parentName: node.name });
                  setNewItemName('');
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add new {levelLabels[getChildLevel(node.level)].toLowerCase()}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const counts = getSelectionCounts();
  const hasSelection = selectedItems.size > 0;
  const maxLevel = getMaxLevel();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ContentIcon className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Add {contentLabel} Categories</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors ml-4">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="search"
                aria-label="Search categories"
                placeholder="Search categories by name..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {searchQuery && (
                <button type="button" aria-label="Clear category search" onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {isSearching && !isLoading && (
              <p className="mt-2 text-sm text-gray-500" role="status">
                {searchResults.matchedNodeIds.size} {searchResults.matchedNodeIds.size === 1 ? 'match' : 'matches'}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="mx-4 my-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : categoryTree.length === 0 ? (
              <div className="text-center py-12">
                <ContentIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No categories found</p>
                <button
                  onClick={() => { setAddingNewItem({ level: 'trade' }); setNewItemName(''); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Add First Trade
                </button>
              </div>
            ) : isSearching && searchResults.matchedNodeIds.size === 0 ? (
              <div className="text-center py-12 text-gray-500">No categories match "{searchQuery.trim()}"</div>
            ) : (
              <div className="py-2">
                {categoryTree.map(node => renderNode(node, 0))}
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-blue-600"
                  onClick={() => { setAddingNewItem({ level: 'trade' }); setNewItemName(''); }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add new trade</span>
                </div>
              </div>
            )}
          </div>

          {addingNewItem && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder={`New ${addingNewItem.level} name`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyPress={e => e.key === 'Enter' && handleAddNewItem()}
                />
                <BusinessActionButton
                  onClick={handleAddNewItem}
                  disabled={!newItemName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed" capability="write:collections"
                >
                  Add
                </BusinessActionButton>
                <button
                  onClick={() => { setAddingNewItem(null); setNewItemName(''); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {hasSelection && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">
                  <strong>Selected:</strong>
                  {counts.trades > 0 && ` ${counts.trades} Trade${counts.trades > 1 ? 's' : ''}`}
                  {counts.sections > 0 && `, ${counts.sections} Section${counts.sections > 1 ? 's' : ''}`}
                  {counts.categories > 0 && `, ${counts.categories} Categor${counts.categories > 1 ? 'ies' : 'y'}`}
                  {(maxLevel === 'subcategory' || maxLevel === 'type') && counts.subcategories > 0 && `, ${counts.subcategories} Subcategor${counts.subcategories > 1 ? 'ies' : 'y'}`}
                  {maxLevel === 'type' && counts.types > 0 && `, ${counts.types} Type${counts.types > 1 ? 's' : ''}`}
                </div>
                <button onClick={clearAll} className="text-sm text-gray-600 hover:text-gray-800">Clear All</button>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center rounded-b-lg">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Layers className="w-4 h-4" />
              <span>Select parent to include all children</span>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <BusinessActionButton
                onClick={handleApply}
                disabled={!hasSelection || isValidating}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${hasSelection && !isValidating
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`} capability="write:collections"
              >
                {isValidating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Validating...</>
                ) : (
                  <><Check className="w-4 h-4" />Apply Selection</>
                )}
              </BusinessActionButton>
            </div>
          </div>
        </div>
      </div>

      <EmptyCategoryWarning
        isOpen={showEmptyWarning}
        emptyCategories={emptyCategories}
        onProceed={handleProceedAnyway}
        onCancel={handleCancelWarning}
      />
    </>
  );
};

export default CollectionCategorySelector;
