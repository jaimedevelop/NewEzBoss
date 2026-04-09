import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import {
    loadInventoryContext,
    generateCollectionFromPrompt,
    loadAISettings,
    saveAISettings,
    verifyAPIKey,
} from '../../services/collections/collections.ai';
import { createCollection } from '../../services/collections';
import { saveCollectionChanges } from '../../services/collections/collections.mutations';
import {
    AISettings,
    AIMessage,
    AIInventoryContext,
    AICollectionResult,
    AIInventoryItem,
    AILaborItem,
    AIToolItem,
    AIEquipmentItem,
} from '../../services/collections/collections.ai.types';
import { AIScopeSelection, ScopeNode } from '../../pages/collections/components/CollectionAIScopeSelector';

export function useCollectionAI() {
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();

    // Settings
    const [settings, setSettings] = useState<AISettings>(loadAISettings);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [verifyError, setVerifyError] = useState<string | null>(null);

    // Chat
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState<'classifying' | 'generating' | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Inventory
    const [inventoryContext, setInventoryContext] = useState<AIInventoryContext | null>(null);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const inventoryLoadedRef = useRef(false);

    // Scope
    const [scopeSelection, setScopeSelection] = useState<AIScopeSelection | null>(null);

    // Result
    const [result, setResult] = useState<AICollectionResult | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // -------------------------------------------------------------------------
    // Settings
    // -------------------------------------------------------------------------

    const updateSettings = useCallback((partial: Partial<AISettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...partial };
            if (partial.provider && partial.provider !== prev.provider) {
                next.modelId = '';
            }
            return next;
        });
        setVerifyStatus('idle');
        setVerifyError(null);
    }, []);

    const persistSettings = useCallback((s: AISettings) => {
        saveAISettings(s);
        setSettings(s);
    }, []);

    const handleVerifyKey = useCallback(async () => {
        if (!settings.apiKey || !settings.modelId) return;
        setIsVerifying(true);
        setVerifyStatus('idle');
        setVerifyError(null);
        const res = await verifyAPIKey(settings);
        setIsVerifying(false);
        if (res.success) {
            setVerifyStatus('success');
            saveAISettings(settings);
        } else {
            setVerifyStatus('error');
            setVerifyError(res.error || 'Verification failed');
        }
    }, [settings]);

    // -------------------------------------------------------------------------
    // Inventory loading
    // -------------------------------------------------------------------------

    const ensureInventoryLoaded = useCallback(async () => {
        if (inventoryLoadedRef.current || !currentUser?.uid) return;
        setIsLoadingInventory(true);
        try {
            const ctx = await loadInventoryContext(currentUser.uid);
            setInventoryContext(ctx);
            inventoryLoadedRef.current = true;
        } catch {
            setError('Failed to load your inventory. Please try again.');
        } finally {
            setIsLoadingInventory(false);
        }
    }, [currentUser]);

    // -------------------------------------------------------------------------
    // Scope filtering
    // -------------------------------------------------------------------------

    const applyScope = useCallback((ctx: AIInventoryContext, scope: AIScopeSelection): AIInventoryContext => {
        const hasScope = (arr: ScopeNode[]) => arr.length > 0;

        return {
            products: hasScope(scope.products)
                ? ctx.products.filter(item => matchesScope(item, scope.products, 'products'))
                : ctx.products,
            labor: hasScope(scope.labor)
                ? ctx.labor.filter(item => matchesScope(item, scope.labor, 'labor'))
                : ctx.labor,
            tools: hasScope(scope.tools)
                ? ctx.tools.filter(item => matchesScope(item, scope.tools, 'tools'))
                : ctx.tools,
            equipment: hasScope(scope.equipment)
                ? ctx.equipment.filter(item => matchesScope(item, scope.equipment, 'equipment'))
                : ctx.equipment,
        };
    }, []);

    // -------------------------------------------------------------------------
    // Chat
    // -------------------------------------------------------------------------

    const sendMessage = useCallback(
        async (text?: string) => {
            const content = (text ?? inputValue).trim();
            if (!content || isLoading) return;

            if (!settings.apiKey) {
                setError('Please add your API key in Settings before generating a collection.');
                return;
            }
            if (!settings.modelId) {
                setError('Please select a model in Settings.');
                return;
            }

            setInputValue('');
            setError(null);
            setResult(null);

            const userMsg: AIMessage = { role: 'user', content, timestamp: Date.now() };
            setMessages(prev => [...prev, userMsg]);

            setIsLoading(true);

            try {
                let ctx = inventoryContext;
                if (!ctx) {
                    setIsLoadingInventory(true);
                    ctx = await loadInventoryContext(currentUser!.uid);
                    setInventoryContext(ctx);
                    inventoryLoadedRef.current = true;
                    setIsLoadingInventory(false);
                }

                // Apply scope filter before sending to AI
                const effectiveCtx = scopeSelection ? applyScope(ctx, scopeSelection) : ctx;

                const aiResult = await generateCollectionFromPrompt(content, effectiveCtx, settings, setLoadingStage);

                setLoadingStage(null);
                setResult(aiResult);

                const assistantMsg: AIMessage = {
                    role: 'assistant',
                    content: buildSummaryMessage(aiResult),
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, assistantMsg]);
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred.');
                setIsLoadingInventory(false);
            } finally {
                setIsLoading(false);
            }
        },
        [inputValue, isLoading, settings, inventoryContext, currentUser, scopeSelection, applyScope],
    );

    // -------------------------------------------------------------------------
    // Save collection
    // -------------------------------------------------------------------------

    const saveCollection = useCallback(async () => {
        if (!result || !inventoryContext || !currentUser?.uid) return;

        setIsSaving(true);
        setError(null);

        try {
            const { productCategoryTabs, productSelections } = buildProductData(result, inventoryContext);
            const { laborCategoryTabs, laborSelections } = buildLaborData(result, inventoryContext);
            const { toolCategoryTabs, toolSelections } = buildToolData(result, inventoryContext);
            const { equipmentCategoryTabs, equipmentSelections } = buildEquipmentData(result, inventoryContext);

            const createResult = await createCollection({
                name: result.name,
                description: result.description,
                category: 'General',
                categorySelection: {
                    trade: result.trade,
                    sections: [],
                    categories: [],
                    subcategories: [],
                    types: [],
                },
                productCategoryTabs,
                laborCategoryTabs,
                toolCategoryTabs,
                equipmentCategoryTabs,
                productSelections,
                laborSelections,
                toolSelections,
                equipmentSelections,
                assignedProducts: [],
                taxRate: 0.07,
                userId: currentUser.uid,
            });

            if (!createResult.success || !createResult.id) {
                throw new Error(createResult.error || 'Failed to create collection');
            }

            await saveCollectionChanges(createResult.id, {
                productCategoryTabs,
                productSelections,
                laborCategoryTabs,
                laborSelections,
                toolCategoryTabs,
                toolSelections,
                equipmentCategoryTabs,
                equipmentSelections,
            });

            navigate(`/collections/${createResult.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to save collection');
        } finally {
            setIsSaving(false);
        }
    }, [result, inventoryContext, currentUser, navigate]);

    const resetChat = useCallback(() => {
        setMessages([]);
        setResult(null);
        setError(null);
        setInputValue('');
    }, []);

    return {
        settings,
        updateSettings,
        persistSettings,
        isVerifying,
        verifyStatus,
        verifyError,
        handleVerifyKey,
        messages,
        inputValue,
        setInputValue,
        isLoading,
        loadingStage,
        isLoadingInventory,
        error,
        sendMessage,
        resetChat,
        inventoryContext,
        ensureInventoryLoaded,
        result,
        isSaving,
        saveCollection,
        scopeSelection,
        setScopeSelection,
    };
}

// ---------------------------------------------------------------------------
// Scope matching helpers
// ---------------------------------------------------------------------------

type ScopeItemType = 'products' | 'labor' | 'tools' | 'equipment';

function matchesScope(item: any, scopeNodes: ScopeNode[], type: ScopeItemType): boolean {
    // Field helpers — handles both naming conventions
    const itemTrade = (item.trade || item.tradeName || '').toLowerCase();
    const itemSection = (item.section || item.sectionName || '').toLowerCase();
    const itemCategory = (item.category || item.categoryName || '').toLowerCase();
    const itemSubcategory = (item.subcategory || item.subcategoryName || '').toLowerCase();

    return scopeNodes.some(node => {
        const nodeName = node.name.toLowerCase();

        switch (node.level) {
            case 'trade':
                return itemTrade === nodeName || itemTrade.includes(nodeName) || nodeName.includes(itemTrade);

            case 'section': {
                const tradeMatches = !node.tradeName ||
                    itemTrade === node.tradeName.toLowerCase() ||
                    itemTrade.includes(node.tradeName.toLowerCase());
                const sectionMatches = itemSection === nodeName;
                return tradeMatches && sectionMatches;
            }

            case 'category': {
                const sectionMatches = !node.sectionName ||
                    itemSection === node.sectionName.toLowerCase();
                const categoryMatches = itemCategory === nodeName;
                return sectionMatches && categoryMatches;
            }

            case 'subcategory': {
                const categoryMatches = !node.categoryName ||
                    itemCategory === node.categoryName.toLowerCase();
                const subcategoryMatches = itemSubcategory === nodeName;
                return categoryMatches && subcategoryMatches;
            }

            default:
                return false;
        }
    });
}

// ---------------------------------------------------------------------------
// Helpers (unchanged from original)
// ---------------------------------------------------------------------------

function buildSummaryMessage(r: AICollectionResult): string {
    const lines = [
        `I've built **${r.name}** for you.`,
        r.description ? `\n${r.description}` : '',
        `\n**Selected items:**`,
        r.selectedProducts.length ? `• ${r.selectedProducts.length} product(s)` : '',
        r.selectedLabor.length ? `• ${r.selectedLabor.length} labor item(s)` : '',
        r.selectedTools.length ? `• ${r.selectedTools.length} tool(s)` : '',
        r.selectedEquipment.length ? `• ${r.selectedEquipment.length} equipment item(s)` : '',
        `\nReview the summary below, then click **Save Collection** to add it, or refine your request.`,
    ];
    return lines.filter(Boolean).join('\n');
}

function makeTabId() {
    return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function buildProductData(result: AICollectionResult, ctx: AIInventoryContext) {
    const tabMap = new Map<string, { tabId: string; section: string; category: string; itemIds: string[] }>();
    const productSelections: Record<string, any> = {};

    for (const sel of result.selectedProducts) {
        const item = ctx.products.find(p => p.id === sel.id);
        if (!item) continue;

        const section = item.section || '';
        const category = item.category || 'General';
        const key = `${section}||${category}`;

        if (!tabMap.has(key)) {
            tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        }
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);

        productSelections[item.id] = {
            isSelected: true,
            quantity: sel.quantity ?? 1,
            categoryTabId: tab.tabId,
            addedAt: Date.now(),
            itemName: item.name,
            itemSku: item.sku || '',
            unitPrice: item.unitPrice || 0,
        };
    }

    const productCategoryTabs = Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
        id: tabId,
        type: 'products' as const,
        name: category,
        section,
        category,
        subcategories: [] as string[],
        itemIds,
    }));

    return { productCategoryTabs, productSelections };
}

function buildLaborData(result: AICollectionResult, ctx: AIInventoryContext) {
    const tabMap = new Map<string, { tabId: string; section: string; category: string; itemIds: string[] }>();
    const laborSelections: Record<string, any> = {};

    for (const sel of result.selectedLabor) {
        const item = ctx.labor.find(l => l.id === sel.id);
        if (!item) continue;

        const section = item.section || '';
        const category = item.category || 'General';
        const key = `${section}||${category}`;

        if (!tabMap.has(key)) {
            tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        }
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);

        laborSelections[item.id] = {
            isSelected: true,
            quantity: sel.quantity ?? 1,
            categoryTabId: tab.tabId,
            addedAt: Date.now(),
            itemName: item.name,
            itemSku: '',
            unitPrice: item.flatRate || item.hourlyRate || 0,
        };
    }

    const laborCategoryTabs = Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
        id: tabId,
        type: 'labor' as const,
        name: category,
        section,
        category,
        subcategories: [] as string[],
        itemIds,
    }));

    return { laborCategoryTabs, laborSelections };
}

function buildToolData(result: AICollectionResult, ctx: AIInventoryContext) {
    const tabMap = new Map<string, { tabId: string; section: string; category: string; itemIds: string[] }>();
    const toolSelections: Record<string, any> = {};

    for (const sel of result.selectedTools) {
        const item = ctx.tools.find(t => t.id === sel.id);
        if (!item) continue;

        const section = item.sectionName || '';
        const category = item.categoryName || 'General';
        const key = `${section}||${category}`;

        if (!tabMap.has(key)) {
            tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        }
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);

        toolSelections[item.id] = {
            isSelected: true,
            quantity: sel.quantity ?? 1,
            categoryTabId: tab.tabId,
            addedAt: Date.now(),
            itemName: item.name,
            itemSku: '',
            unitPrice: item.minimumCustomerCharge || 0,
        };
    }

    const toolCategoryTabs = Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
        id: tabId,
        type: 'tools' as const,
        name: category,
        section,
        category,
        subcategories: [] as string[],
        itemIds,
    }));

    return { toolCategoryTabs, toolSelections };
}

function buildEquipmentData(result: AICollectionResult, ctx: AIInventoryContext) {
    const tabMap = new Map<string, { tabId: string; section: string; category: string; itemIds: string[] }>();
    const equipmentSelections: Record<string, any> = {};

    for (const sel of result.selectedEquipment) {
        const item = ctx.equipment.find(e => e.id === sel.id);
        if (!item) continue;

        const section = item.sectionName || '';
        const category = item.categoryName || 'General';
        const key = `${section}||${category}`;

        if (!tabMap.has(key)) {
            tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        }
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);

        equipmentSelections[item.id] = {
            isSelected: true,
            quantity: sel.quantity ?? 1,
            categoryTabId: tab.tabId,
            addedAt: Date.now(),
            itemName: item.name,
            itemSku: '',
            unitPrice: item.minimumCustomerCharge || 0,
        };
    }

    const equipmentCategoryTabs = Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
        id: tabId,
        type: 'equipment' as const,
        name: category,
        section,
        category,
        subcategories: [] as string[],
        itemIds,
    }));

    return { equipmentCategoryTabs, equipmentSelections };
}