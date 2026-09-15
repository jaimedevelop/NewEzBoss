import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import {
    loadInventoryContext,
    generateCollectionFromPrompt,
    loadAISettings,
    saveAISettings,
    verifyAPIKey,
} from '../../services/collections/ai/collections.ai';
import {
    loadAISettingsFromFirestore,
    saveAISettingsToFirestore,
} from '../../services/collections/ai/collections.ai.firestore';
import { createCollection } from '../../services/collections';
import { saveCollectionChanges } from '../../services/collections/collections.mutations';
import {
    AISettings,
    AIMessage,
    AIInventoryContext,
    AICollectionResult,
} from '../../services/collections/ai/collections.ai.types';
import { AIScopeSelection, ScopeNode } from '../../pages/collections/components/CollectionAIScopeSelector';
import { credentialFor, providerIdFor } from '../../services/collections/ai/collections.ai.adapters';

export function useCollectionAI() {
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();

    // Settings — start from localStorage immediately (no flash)
    const [settings, setSettings] = useState<AISettings>(() => loadAISettings());
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
    const requestRef = useRef(0);
    const controllerRef = useRef<AbortController | null>(null);
    const createdCollectionIdRef = useRef<string | null>(null);

    // -------------------------------------------------------------------------
    // On mount — merge Firestore settings over local settings (keys stay local)
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!currentUser?.uid) return;
        const uid = currentUser.uid;

        loadAISettingsFromFirestore(uid).then(remote => {
            if (!remote) return;
            setSettings(prev => {
                const merged: AISettings = {
                    ...prev,
                    // Overwrite non-sensitive fields from Firestore
                    provider: remote.provider,
                    modelId: remote.modelId,
                    customProviders: remote.customProviders ?? [],
                    customModels: remote.customModels ?? [],
                    activeCustomProviderId: remote.activeCustomProviderId,
                    // Restore the correct local key for the remote provider
                    apiKey: (() => {
                        const keyId = providerIdFor(remote.provider, remote.activeCustomProviderId);
                        return prev.apiKeys[keyId] ?? '';
                    })(),
                };
                return merged;
            });
        });
    }, [currentUser?.uid]);

    useEffect(() => {
        requestRef.current += 1;
        controllerRef.current?.abort();
        inventoryLoadedRef.current = false;
        setInventoryContext(null); setMessages([]); setResult(null); setScopeSelection(null);
    }, [currentUser?.uid]);

    // -------------------------------------------------------------------------
    // Settings
    // -------------------------------------------------------------------------

    const updateSettings = useCallback((partial: Partial<AISettings>) => {
        setSettings(prev => {
            const next = {
                ...prev,
                ...partial,
                apiKeys: { ...(prev.apiKeys ?? {}), ...(partial.apiKeys ?? {}) },
            };

            if (partial.apiKey !== undefined) {
            const keyId = providerIdFor(next.provider, next.activeCustomProviderId);
                if (keyId) next.apiKeys[keyId] = partial.apiKey.trim();
            }

            if (partial.provider !== undefined || partial.activeCustomProviderId !== undefined) {
                const keyId = providerIdFor(next.provider, next.activeCustomProviderId);
                next.apiKey = next.apiKeys[keyId] ?? '';
                if (partial.provider && partial.provider !== prev.provider) next.modelId = '';
            }
            const activeProviderId = providerIdFor(next.provider, next.activeCustomProviderId);
            next.modelIdsByProvider = { ...(prev.modelIdsByProvider ?? {}), ...(partial.modelId ? { [activeProviderId]: partial.modelId } : {}) };

            return next;
        });
        setVerifyStatus('idle');
        setVerifyError(null);
    }, []);

    // Saves keys to localStorage, non-key fields to Firestore
    const persistSettings = useCallback(async (s: AISettings) => {
        saveAISettings(s, currentUser?.uid); // localStorage (keys + fallback)
        setSettings(s);
        if (currentUser?.uid) {
            await saveAISettingsToFirestore(currentUser.uid, s);
        }
    }, [currentUser?.uid]);

    const handleVerifyKey = useCallback(async () => {
        if (!settings.apiKey || !settings.modelId) return;
        setIsVerifying(true);
        setVerifyStatus('idle');
        setVerifyError(null);
        const res = await verifyAPIKey(settings);
        setIsVerifying(false);
        if (res.success) {
            setVerifyStatus('success');
        } else {
            setVerifyStatus('error');
            setVerifyError(res.error || 'Verification failed');
        }
    }, [settings, persistSettings]);

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
                ? ctx.products.filter(item => matchesScope(item, scope.products))
                : ctx.products,
            labor: hasScope(scope.labor)
                ? ctx.labor.filter(item => matchesScope(item, scope.labor))
                : ctx.labor,
            tools: hasScope(scope.tools)
                ? ctx.tools.filter(item => matchesScope(item, scope.tools))
                : ctx.tools,
            equipment: hasScope(scope.equipment)
                ? ctx.equipment.filter(item => matchesScope(item, scope.equipment))
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

            if (!credentialFor(settings)) {
                setError('Please add your API key in Settings before generating a collection.');
                return;
            }
            if (!settings.modelId) {
                setError('Please select a model in Settings.');
                return;
            }

            setInputValue('');
            setError(null);
            const previousResult = result;

            const userMsg: AIMessage = { role: 'user', content, timestamp: Date.now() };
            setMessages(prev => [...prev, userMsg]);
            setIsLoading(true);
            const requestId = ++requestRef.current;
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;

            try {
                let ctx = inventoryContext;
                if (!ctx) {
                    setIsLoadingInventory(true);
                    ctx = await loadInventoryContext(currentUser!.uid);
                    setInventoryContext(ctx);
                    inventoryLoadedRef.current = true;
                    setIsLoadingInventory(false);
                }

                const effectiveCtx = scopeSelection ? applyScope(ctx, scopeSelection) : ctx;
                const aiResult = await generateCollectionFromPrompt(content, effectiveCtx, settings, setLoadingStage, controller.signal);
                if (requestId !== requestRef.current) return;

                setLoadingStage(null);
                setResult(aiResult);

                const assistantMsg: AIMessage = {
                    role: 'assistant',
                    content: buildSummaryMessage(aiResult),
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, assistantMsg]);
            } catch (err: any) {
                if (err?.name === 'AbortError' || requestId !== requestRef.current) return;
                setResult(previousResult);
                setError(err.message || 'An unexpected error occurred.');
                setIsLoadingInventory(false);
            } finally {
                if (requestId === requestRef.current) setIsLoading(false);
            }
        },
        [inputValue, isLoading, settings, inventoryContext, currentUser, scopeSelection, applyScope, result],
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

            const createResult = createdCollectionIdRef.current ? { success: true, id: createdCollectionIdRef.current } : await createCollection({
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
            createdCollectionIdRef.current = createResult.id;

            const sync = await saveCollectionChanges(createResult.id, {
                productCategoryTabs,
                productSelections,
                laborCategoryTabs,
                laborSelections,
                toolCategoryTabs,
                toolSelections,
                equipmentCategoryTabs,
                equipmentSelections,
            });
            if (!sync?.success) throw new Error(sync?.error || 'Collection was created but its items could not be saved. Retry to finish syncing.');

            navigate(`/collections/${createResult.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to save collection');
        } finally {
            setIsSaving(false);
        }
    }, [result, inventoryContext, currentUser, navigate]);

    const resetChat = useCallback(() => {
        requestRef.current += 1;
        controllerRef.current?.abort();
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

function matchesScope(item: any, scopeNodes: ScopeNode[]): boolean {
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
                return tradeMatches && itemSection === nodeName;
            }
            case 'category': {
                const sectionMatches = !node.sectionName || itemSection === node.sectionName.toLowerCase();
                return sectionMatches && itemCategory === nodeName;
            }
            case 'subcategory': {
                const categoryMatches = !node.categoryName || itemCategory === node.categoryName.toLowerCase();
                return categoryMatches && itemSubcategory === nodeName;
            }
            default: return false;
        }
    });
}

// ---------------------------------------------------------------------------
// Helpers
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
        if (!tabMap.has(key)) tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);
        productSelections[item.id] = {
            isSelected: true, quantity: sel.quantity ?? 1, categoryTabId: tab.tabId,
            addedAt: Date.now(), itemName: item.name, itemSku: item.sku || '', unitPrice: item.unitPrice || 0,
        };
    }

    return {
        productCategoryTabs: Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
            id: tabId, type: 'products' as const, name: category, section, category, subcategories: [] as string[], itemIds,
        })),
        productSelections,
    };
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
        if (!tabMap.has(key)) tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);
        laborSelections[item.id] = {
            isSelected: true, quantity: sel.quantity ?? 1, categoryTabId: tab.tabId,
            addedAt: Date.now(), itemName: item.name, itemSku: '', unitPrice: item.flatRate || item.hourlyRate || 0,
        };
    }

    return {
        laborCategoryTabs: Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
            id: tabId, type: 'labor' as const, name: category, section, category, subcategories: [] as string[], itemIds,
        })),
        laborSelections,
    };
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
        if (!tabMap.has(key)) tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);
        toolSelections[item.id] = {
            isSelected: true, quantity: sel.quantity ?? 1, categoryTabId: tab.tabId,
            addedAt: Date.now(), itemName: item.name, itemSku: '', unitPrice: item.minimumCustomerCharge || 0,
        };
    }

    return {
        toolCategoryTabs: Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
            id: tabId, type: 'tools' as const, name: category, section, category, subcategories: [] as string[], itemIds,
        })),
        toolSelections,
    };
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
        if (!tabMap.has(key)) tabMap.set(key, { tabId: makeTabId(), section, category, itemIds: [] });
        const tab = tabMap.get(key)!;
        tab.itemIds.push(item.id);
        equipmentSelections[item.id] = {
            isSelected: true, quantity: sel.quantity ?? 1, categoryTabId: tab.tabId,
            addedAt: Date.now(), itemName: item.name, itemSku: '', unitPrice: item.minimumCustomerCharge || 0,
        };
    }

    return {
        equipmentCategoryTabs: Array.from(tabMap.values()).map(({ tabId, section, category, itemIds }) => ({
            id: tabId, type: 'equipment' as const, name: category, section, category, subcategories: [] as string[], itemIds,
        })),
        equipmentSelections,
    };
}
