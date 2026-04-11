import React, { useState, useCallback, useRef } from 'react';
import {
    X, ChevronRight, Check, Loader2, Package, Briefcase, Wrench, Truck,
} from 'lucide-react';

import { getProductTrades, getProductSections, getProductCategories, getProductSubcategories } from '../../../services/categories';
import { getSections as getLaborSections, } from '../../../services/inventory/labor/sections';
import { getCategories as getLaborCategories } from '../../../services/inventory/labor/categories';
import { getToolSections } from '../../../services/inventory/tools/sections';
import { getToolCategories } from '../../../services/inventory/tools/categories';
import { getToolSubcategories } from '../../../services/inventory/tools/subcategories';
import { getEquipmentSections } from '../../../services/inventory/equipment/sections';
import { getEquipmentCategories } from '../../../services/inventory/equipment/categories';
import { getEquipmentSubcategories } from '../../../services/inventory/equipment/subcategories';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScopeContentType = 'products' | 'labor' | 'tools' | 'equipment';

export interface AIScopeSelection {
    products: ScopeNode[];
    labor: ScopeNode[];
    tools: ScopeNode[];
    equipment: ScopeNode[];
}

export interface ScopeNode {
    id: string;
    name: string;
    level: 'trade' | 'section' | 'category' | 'subcategory';
    tradeId?: string;
    tradeName?: string;
    sectionId?: string;
    sectionName?: string;
    categoryId?: string;
    categoryName?: string;
}

interface TreeNode {
    id: string;
    name: string;
    level: 'trade' | 'section' | 'category' | 'subcategory';
    parentId?: string;
    children?: TreeNode[];
    isExpanded?: boolean;
    isLoading?: boolean;
}

interface CollectionAIScopeSelectorProps {
    userId: string;
    initialScope?: AIScopeSelection;
    onApply: (scope: AIScopeSelection) => void;
    onClose: () => void;
}

const TABS: { type: ScopeContentType; label: string; icon: React.ElementType }[] = [
    { type: 'products', label: 'Products', icon: Package },
    { type: 'labor', label: 'Labor', icon: Briefcase },
    { type: 'tools', label: 'Tools', icon: Wrench },
    { type: 'equipment', label: 'Equipment', icon: Truck },
];

const MAX_LEVEL: Record<ScopeContentType, TreeNode['level']> = {
    products: 'subcategory',
    labor: 'category',
    tools: 'subcategory',
    equipment: 'subcategory',
};

// ─── Component ───────────────────────────────────────────────────────────────

const CollectionAIScopeSelector: React.FC<CollectionAIScopeSelectorProps> = ({
    userId, initialScope, onApply, onClose,
}) => {
    const [activeTab, setActiveTab] = useState<ScopeContentType>('products');

    const [trees, setTrees] = useState<Record<ScopeContentType, TreeNode[]>>({
        products: [], labor: [], tools: [], equipment: [],
    });

    // Use refs for loaded/loading tracking to avoid stale closures and spurious re-renders
    const loadedTabsRef = useRef<Set<ScopeContentType>>(new Set());
    const loadingTabsRef = useRef<Set<ScopeContentType>>(new Set());

    // Separate loading state just for the spinner UI
    const [loadingUI, setLoadingUI] = useState<Set<ScopeContentType>>(new Set());

    const [selected, setSelected] = useState<Record<ScopeContentType, Set<string>>>(() => {
        const toSet = (nodes: ScopeNode[]) => new Set(nodes.map(n => n.id));
        return {
            products: toSet(initialScope?.products ?? []),
            labor: toSet(initialScope?.labor ?? []),
            tools: toSet(initialScope?.tools ?? []),
            equipment: toSet(initialScope?.equipment ?? []),
        };
    });

    // ── Tree loading ──────────────────────────────────────────────────────────

    const loadRoots = useCallback(async (type: ScopeContentType) => {
        if (loadedTabsRef.current.has(type) || loadingTabsRef.current.has(type)) return;

        loadingTabsRef.current.add(type);
        setLoadingUI(prev => new Set(prev).add(type));

        try {
            // Each type loads its own trade roots
            let res: any;
            switch (type) {
                case 'products': res = await getProductTrades(userId); break;
                case 'labor': res = await getProductTrades(userId); break; // replace with labor-specific if available
                case 'tools': res = await getProductTrades(userId); break; // replace with tools-specific if available
                case 'equipment': res = await getProductTrades(userId); break; // replace with equipment-specific if available
            }

            if (res?.success && res.data) {
                setTrees(prev => ({
                    ...prev,
                    [type]: res.data.map((t: any) => ({
                        id: t.id, name: t.name, level: 'trade' as const,
                        isExpanded: false, children: [],
                    })),
                }));
            }
        } finally {
            loadedTabsRef.current.add(type);
            loadingTabsRef.current.delete(type);
            setLoadingUI(prev => { const s = new Set(prev); s.delete(type); return s; });
        }
    }, [userId]); // No longer depends on loadedTabs/loadingTabs sets

    const loadChildren = useCallback(async (type: ScopeContentType, node: TreeNode): Promise<TreeNode[]> => {
        let res: any;
        try {
            switch (type) {
                case 'products':
                    if (node.level === 'trade') res = await getProductSections(node.id, userId);
                    else if (node.level === 'section') res = await getProductCategories(node.id, userId);
                    else if (node.level === 'category') res = await getProductSubcategories(node.id, userId);
                    break;
                case 'labor':
                    if (node.level === 'trade') res = await getLaborSections(node.id, userId);
                    else if (node.level === 'section') res = await getLaborCategories(node.id, userId);
                    break;
                case 'tools':
                    if (node.level === 'trade') res = await getToolSections(node.id, userId);
                    else if (node.level === 'section') res = await getToolCategories(node.id, userId);
                    else if (node.level === 'category') res = await getToolSubcategories(node.id, userId);
                    break;
                case 'equipment':
                    if (node.level === 'trade') res = await getEquipmentSections(node.id, userId);
                    else if (node.level === 'section') res = await getEquipmentCategories(node.id, userId);
                    else if (node.level === 'category') res = await getEquipmentSubcategories(node.id, userId);
                    break;
            }
        } catch { return []; }

        if (!res?.success || !res.data) return [];
        const childLevel = getChildLevel(type, node.level);
        return res.data.map((item: any) => ({
            id: item.id, name: item.name, level: childLevel,
            parentId: node.id, isExpanded: false, children: [],
        }));
    }, [userId]);

    // ── Tab activation ────────────────────────────────────────────────────────

    const handleTabChange = (type: ScopeContentType) => {
        setActiveTab(type);
        loadRoots(type);
    };

    React.useEffect(() => { loadRoots('products'); }, []); // eslint-disable-line

    // ── Tree mutations ────────────────────────────────────────────────────────

    const updateTree = (type: ScopeContentType, updater: (nodes: TreeNode[]) => TreeNode[]) => {
        setTrees(prev => ({ ...prev, [type]: updater(prev[type]) }));
    };

    const patchNode = (nodes: TreeNode[], id: string, patch: Partial<TreeNode>): TreeNode[] =>
        nodes.map(n => {
            if (n.id === id) return { ...n, ...patch };
            if (n.children) return { ...n, children: patchNode(n.children, id, patch) };
            return n;
        });

    const toggleExpand = async (type: ScopeContentType, node: TreeNode) => {
        if (node.level === MAX_LEVEL[type]) return;
        const willExpand = !node.isExpanded;

        updateTree(type, nodes => patchNode(nodes, node.id, {
            isExpanded: willExpand,
            isLoading: willExpand && (!node.children || node.children.length === 0),
        }));

        if (willExpand && (!node.children || node.children.length === 0)) {
            const children = await loadChildren(type, node);
            updateTree(type, nodes => patchNode(nodes, node.id, { children, isLoading: false }));
        }
    };

    // ── Selection ─────────────────────────────────────────────────────────────

    const getAllDescendantIds = (node: TreeNode): string[] => {
        let ids = [node.id];
        node.children?.forEach(c => { ids = [...ids, ...getAllDescendantIds(c)]; });
        return ids;
    };

    const toggleSelect = (type: ScopeContentType, node: TreeNode) => {
        setSelected(prev => {
            const next = new Set(prev[type]);
            const ids = getAllDescendantIds(node);
            if (next.has(node.id)) ids.forEach(id => next.delete(id));
            else ids.forEach(id => next.add(id));
            return { ...prev, [type]: next };
        });
    };

    // ── Build final scope ─────────────────────────────────────────────────────

    const buildScope = (): AIScopeSelection => {
        const extract = (type: ScopeContentType): ScopeNode[] => {
            const sel = selected[type];
            if (sel.size === 0) return [];

            // If the tree for this type was never loaded, fall back to the initialScope
            // nodes whose IDs are still present in the selection set.
            if (!loadedTabsRef.current.has(type)) {
                return (initialScope?.[type] ?? []).filter(n => sel.has(n.id));
            }

            const result: ScopeNode[] = [];

            const walk = (
                nodes: TreeNode[],
                ancestors: { trade?: TreeNode; section?: TreeNode; category?: TreeNode },
            ) => {
                for (const n of nodes) {
                    if (sel.has(n.id) && !(n.parentId && sel.has(n.parentId))) {
                        result.push({
                            id: n.id,
                            name: n.name,
                            level: n.level,
                            tradeId: ancestors.trade?.id,
                            tradeName: ancestors.trade?.name,
                            sectionId: ancestors.section?.id,
                            sectionName: ancestors.section?.name,
                            categoryId: ancestors.category?.id,
                            categoryName: ancestors.category?.name,
                        });
                    }
                    if (n.children?.length) {
                        walk(n.children, {
                            trade: n.level === 'trade' ? n : ancestors.trade,
                            section: n.level === 'section' ? n : ancestors.section,
                            category: n.level === 'category' ? n : ancestors.category,
                        });
                    }
                }
            };
            walk(trees[type], {});
            return result;
        };

        return {
            products: extract('products'),
            labor: extract('labor'),
            tools: extract('tools'),
            equipment: extract('equipment'),
        };
    };

    const handleApply = () => {
        onApply(buildScope());
        onClose();
    };

    const clearTab = (type: ScopeContentType) => {
        setSelected(prev => ({ ...prev, [type]: new Set() }));
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const totalSelected = Object.values(selected).reduce((sum, s) => sum + s.size, 0);

    return (
        <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[75vh] flex flex-col">

                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">Scope Inventory</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Limit what the AI searches. Leave empty to search everything.
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 px-1 pt-1 gap-1">
                        {TABS.map(({ type, label, icon: Icon }) => {
                            const count = selected[type].size;
                            const isActive = activeTab === type;
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleTabChange(type)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${isActive
                                        ? 'border-orange-500 text-orange-700 bg-orange-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                    {count > 0 && (
                                        <span className="bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0 leading-4">
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tree */}
                    <div className="flex-1 overflow-y-auto py-1">
                        {loadingUI.has(activeTab) ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                            </div>
                        ) : trees[activeTab].length === 0 && loadedTabsRef.current.has(activeTab) ? (
                            <p className="text-center text-sm text-gray-400 py-10">No categories found.</p>
                        ) : (
                            <>
                                {trees[activeTab].map(node => (
                                    <TreeRow
                                        key={node.id}
                                        node={node}
                                        depth={0}
                                        type={activeTab}
                                        maxLevel={MAX_LEVEL[activeTab]}
                                        selected={selected[activeTab]}
                                        onToggleExpand={toggleExpand}
                                        onToggleSelect={toggleSelect}
                                    />
                                ))}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {selected[activeTab].size > 0 && (
                                <button
                                    onClick={() => clearTab(activeTab)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                    Clear {TABS.find(t => t.type === activeTab)?.label}
                                </button>
                            )}
                            {totalSelected > 0 && (
                                <span className="text-xs text-gray-500">
                                    {totalSelected} node{totalSelected !== 1 ? 's' : ''} scoped
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-1.5"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Apply Scope
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── TreeRow ─────────────────────────────────────────────────────────────────

interface TreeRowProps {
    node: TreeNode;
    depth: number;
    type: ScopeContentType;
    maxLevel: TreeNode['level'];
    selected: Set<string>;
    onToggleExpand: (type: ScopeContentType, node: TreeNode) => void;
    onToggleSelect: (type: ScopeContentType, node: TreeNode) => void;
}

function TreeRow({ node, depth, type, maxLevel, selected, onToggleExpand, onToggleSelect }: TreeRowProps) {
    const isSelected = selected.has(node.id);
    const canExpand = node.level !== maxLevel;

    const levelDot: Record<TreeNode['level'], string> = {
        trade: 'bg-orange-400',
        section: 'bg-blue-400',
        category: 'bg-purple-400',
        subcategory: 'bg-green-400',
    };

    return (
        <>
            <div
                className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                style={{ paddingLeft: `${(depth * 20) + 12}px` }}
            >
                <div
                    className="w-4 flex-shrink-0 flex items-center justify-center"
                    onClick={() => canExpand && onToggleExpand(type, node)}
                >
                    {canExpand ? (
                        node.isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-gray-300" />
                        ) : (
                            <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${node.isExpanded ? 'rotate-90' : ''}`} />
                        )
                    ) : null}
                </div>

                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${levelDot[node.level]}`} />

                <span
                    className={`flex-1 text-sm truncate ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                    onClick={() => canExpand && onToggleExpand(type, node)}
                >
                    {node.name}
                </span>

                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(type, node)}
                    onClick={e => e.stopPropagation()}
                    className="w-3.5 h-3.5 text-orange-600 rounded focus:ring-orange-500 cursor-pointer flex-shrink-0"
                />
            </div>

            {node.isExpanded && node.children?.map(child => (
                <TreeRow
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    type={type}
                    maxLevel={maxLevel}
                    selected={selected}
                    onToggleExpand={onToggleExpand}
                    onToggleSelect={onToggleSelect}
                />
            ))}
        </>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getChildLevel(type: ScopeContentType, parentLevel: TreeNode['level']): TreeNode['level'] {
    const maps: Record<ScopeContentType, Partial<Record<TreeNode['level'], TreeNode['level']>>> = {
        products: { trade: 'section', section: 'category', category: 'subcategory' },
        labor: { trade: 'section', section: 'category' },
        tools: { trade: 'section', section: 'category', category: 'subcategory' },
        equipment: { trade: 'section', section: 'category', category: 'subcategory' },
    };
    return maps[type][parentLevel] ?? 'subcategory';
}

export default CollectionAIScopeSelector;