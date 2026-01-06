// src/hooks/collections/collectionsScreen/useCollectionItems.ts
import { useState, useCallback } from 'react';
import {
    getProductsForCollectionTabs,
    getLaborItemsForCollectionTabs,
    getToolsForCollectionTabs,
    getEquipmentForCollectionTabs,
} from '../../../services/collections';
import {
    getCachedProducts,
    setCachedProducts,
} from '../../../utils/productCache';
import type { CategoryTab, CollectionContentType } from '../../../services/collections';

export function useCollectionItems() {
    // Items state
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [allLaborItems, setAllLaborItems] = useState<any[]>([]);
    const [allToolItems, setAllToolItems] = useState<any[]>([]);
    const [allEquipmentItems, setAllEquipmentItems] = useState<any[]>([]);

    // Loading state
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isLoadingLabor, setIsLoadingLabor] = useState(false);
    const [isLoadingTools, setIsLoadingTools] = useState(false);
    const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);

    // Error state
    const [productLoadError, setProductLoadError] = useState<string | null>(null);
    const [laborLoadError, setLaborLoadError] = useState<string | null>(null);
    const [toolLoadError, setToolLoadError] = useState<string | null>(null);
    const [equipmentLoadError, setEquipmentLoadError] = useState<string | null>(null);

    // Load products with caching
    const loadProducts = useCallback(async (tabs: CategoryTab[]) => {
        if (!tabs || tabs.length === 0) {
            setIsLoadingProducts(false);
            return;
        }

        setIsLoadingProducts(true);
        setProductLoadError(null);

        try {
            const allProductIds = Array.from(
                new Set(tabs.flatMap(tab => tab.itemIds))
            );

            const { cachedProducts, missingIds } = getCachedProducts(allProductIds);
            let fetchedProducts: any[] = [];

            if (missingIds.length > 0) {
                const result = await getProductsForCollectionTabs(missingIds);
                if (result.success && result.data) {
                    fetchedProducts = result.data;
                    setCachedProducts(fetchedProducts);
                } else {
                    setProductLoadError(result.error?.message || 'Failed to load products');
                }
            }

            setAllProducts([...cachedProducts, ...fetchedProducts]);
        } catch (error: any) {
            setProductLoadError(error.message || 'Error loading products');
        } finally {
            setIsLoadingProducts(false);
        }
    }, []);

    // Load labor items
    const loadLabor = useCallback(async (tabs: CategoryTab[]) => {
        if (!tabs || tabs.length === 0) {
            setIsLoadingLabor(false);
            return;
        }

        setIsLoadingLabor(true);
        setLaborLoadError(null);

        try {
            const allLaborIds = Array.from(
                new Set(tabs.flatMap(tab => tab.itemIds))
            );

            const result = await getLaborItemsForCollectionTabs(allLaborIds);
            if (result.success && result.data) {
                setAllLaborItems(result.data);
            } else {
                setLaborLoadError(result.error?.message || 'Failed to load labor items');
            }
        } catch (error: any) {
            setLaborLoadError(error.message || 'Error loading labor items');
        } finally {
            setIsLoadingLabor(false);
        }
    }, []);

    // Load tools
    const loadTools = useCallback(async (tabs: CategoryTab[]) => {
        if (!tabs || tabs.length === 0) {
            setIsLoadingTools(false);
            return;
        }

        setIsLoadingTools(true);
        setToolLoadError(null);

        try {
            const allToolIds = Array.from(
                new Set(tabs.flatMap(tab => tab.itemIds))
            );

            const result = await getToolsForCollectionTabs(allToolIds);
            if (result.success && result.data) {
                setAllToolItems(result.data);
            } else {
                setToolLoadError(result.error?.message || 'Failed to load tools');
            }
        } catch (error: any) {
            setToolLoadError(error.message || 'Error loading tools');
        } finally {
            setIsLoadingTools(false);
        }
    }, []);

    // Load equipment
    const loadEquipment = useCallback(async (tabs: CategoryTab[]) => {
        if (!tabs || tabs.length === 0) {
            setIsLoadingEquipment(false);
            return;
        }

        setIsLoadingEquipment(true);
        setEquipmentLoadError(null);

        try {
            const allEquipmentIds = Array.from(
                new Set(tabs.flatMap(tab => tab.itemIds))
            );

            const result = await getEquipmentForCollectionTabs(allEquipmentIds);
            if (result.success && result.data) {
                setAllEquipmentItems(result.data);
            } else {
                setEquipmentLoadError(result.error?.message || 'Failed to load equipment');
            }
        } catch (error: any) {
            setEquipmentLoadError(error.message || 'Error loading equipment');
        } finally {
            setIsLoadingEquipment(false);
        }
    }, []);

    // Load items for a specific content type
    const loadItems = useCallback(async (contentType: CollectionContentType, tabs: CategoryTab[]) => {
        switch (contentType) {
            case 'products': return loadProducts(tabs);
            case 'labor': return loadLabor(tabs);
            case 'tools': return loadTools(tabs);
            case 'equipment': return loadEquipment(tabs);
        }
    }, [loadProducts, loadLabor, loadTools, loadEquipment]);

    // Get items for a specific content type
    const getItems = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': return allProducts;
            case 'labor': return allLaborItems;
            case 'tools': return allToolItems;
            case 'equipment': return allEquipmentItems;
        }
    }, [allProducts, allLaborItems, allToolItems, allEquipmentItems]);

    // Get loading state for a specific content type
    const getIsLoading = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': return isLoadingProducts;
            case 'labor': return isLoadingLabor;
            case 'tools': return isLoadingTools;
            case 'equipment': return isLoadingEquipment;
        }
    }, [isLoadingProducts, isLoadingLabor, isLoadingTools, isLoadingEquipment]);

    // Get error for a specific content type
    const getLoadError = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': return productLoadError;
            case 'labor': return laborLoadError;
            case 'tools': return toolLoadError;
            case 'equipment': return equipmentLoadError;
        }
    }, [productLoadError, laborLoadError, toolLoadError, equipmentLoadError]);

    // Clear items
    const clearItems = useCallback((contentType: CollectionContentType) => {
        switch (contentType) {
            case 'products': setAllProducts([]); break;
            case 'labor': setAllLaborItems([]); break;
            case 'tools': setAllToolItems([]); break;
            case 'equipment': setAllEquipmentItems([]); break;
        }
    }, []);

    // Load all items in parallel (for Summary view) - BATCHED VERSION
    const loadAllItems = useCallback(async (
        productTabs: CategoryTab[],
        laborTabs: CategoryTab[],
        toolTabs: CategoryTab[],
        equipmentTabs: CategoryTab[]
    ) => {
        // Set all loading states at once
        setIsLoadingProducts(productTabs.length > 0);
        setIsLoadingLabor(laborTabs.length > 0);
        setIsLoadingTools(toolTabs.length > 0);
        setIsLoadingEquipment(equipmentTabs.length > 0);

        // Clear all errors
        setProductLoadError(null);
        setLaborLoadError(null);
        setToolLoadError(null);
        setEquipmentLoadError(null);

        try {
            // Fetch all data in parallel
            const [productsResult, laborResult, toolsResult, equipmentResult] = await Promise.all([
                // Products
                (async () => {
                    if (productTabs.length === 0) return { data: [], error: null };
                    try {
                        const allProductIds = Array.from(new Set(productTabs.flatMap(tab => tab.itemIds)));
                        const { cachedProducts, missingIds } = getCachedProducts(allProductIds);
                        let fetchedProducts: any[] = [];

                        if (missingIds.length > 0) {
                            const result = await getProductsForCollectionTabs(missingIds);
                            if (result.success && result.data) {
                                fetchedProducts = result.data;
                                setCachedProducts(fetchedProducts);
                            } else {
                                return { data: [], error: result.error?.message || 'Failed to load products' };
                            }
                        }
                        return { data: [...cachedProducts, ...fetchedProducts], error: null };
                    } catch (error: any) {
                        return { data: [], error: error.message || 'Error loading products' };
                    }
                })(),
                // Labor
                (async () => {
                    if (laborTabs.length === 0) return { data: [], error: null };
                    try {
                        const allLaborIds = Array.from(new Set(laborTabs.flatMap(tab => tab.itemIds)));
                        const result = await getLaborItemsForCollectionTabs(allLaborIds);
                        if (result.success && result.data) {
                            return { data: result.data, error: null };
                        } else {
                            return { data: [], error: result.error?.message || 'Failed to load labor items' };
                        }
                    } catch (error: any) {
                        return { data: [], error: error.message || 'Error loading labor items' };
                    }
                })(),
                // Tools
                (async () => {
                    if (toolTabs.length === 0) return { data: [], error: null };
                    try {
                        const allToolIds = Array.from(new Set(toolTabs.flatMap(tab => tab.itemIds)));
                        const result = await getToolsForCollectionTabs(allToolIds);
                        if (result.success && result.data) {
                            return { data: result.data, error: null };
                        } else {
                            return { data: [], error: result.error?.message || 'Failed to load tools' };
                        }
                    } catch (error: any) {
                        return { data: [], error: error.message || 'Error loading tools' };
                    }
                })(),
                // Equipment
                (async () => {
                    if (equipmentTabs.length === 0) return { data: [], error: null };
                    try {
                        const allEquipmentIds = Array.from(new Set(equipmentTabs.flatMap(tab => tab.itemIds)));
                        const result = await getEquipmentForCollectionTabs(allEquipmentIds);
                        if (result.success && result.data) {
                            return { data: result.data, error: null };
                        } else {
                            return { data: [], error: result.error?.message || 'Failed to load equipment' };
                        }
                    } catch (error: any) {
                        return { data: [], error: error.message || 'Error loading equipment' };
                    }
                })(),
            ]);

            // Update ALL states in a single batch (React 18 automatic batching)
            setAllProducts(productsResult.data);
            setAllLaborItems(laborResult.data);
            setAllToolItems(toolsResult.data);
            setAllEquipmentItems(equipmentResult.data);

            // Set errors if any
            setProductLoadError(productsResult.error);
            setLaborLoadError(laborResult.error);
            setToolLoadError(toolsResult.error);
            setEquipmentLoadError(equipmentResult.error);

        } finally {
            // Clear all loading states in a single batch
            setIsLoadingProducts(false);
            setIsLoadingLabor(false);
            setIsLoadingTools(false);
            setIsLoadingEquipment(false);
        }
    }, []);

    return {
        // Items
        allProducts,
        allLaborItems,
        allToolItems,
        allEquipmentItems,

        // Loading states
        isLoadingProducts,
        isLoadingLabor,
        isLoadingTools,
        isLoadingEquipment,

        // Errors
        productLoadError,
        laborLoadError,
        toolLoadError,
        equipmentLoadError,

        // Methods
        loadItems,
        loadAllItems,
        getItems,
        getIsLoading,
        getLoadError,
        clearItems,
    };
}