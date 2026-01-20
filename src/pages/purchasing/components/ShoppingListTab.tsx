// src/pages/purchasing/components/ShoppingListTab.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Star, TrendingDown, Info } from 'lucide-react';
import type { PurchaseOrderWithId } from '../../../services/purchasing';
import { getProduct } from '../../../services/inventory/products/products.queries';
import type { InventoryProduct } from '../../../services/inventory/products/products.types';

interface ShoppingListTabProps {
    purchaseOrder: PurchaseOrderWithId;
}

const ShoppingListTab: React.FC<ShoppingListTabProps> = ({ purchaseOrder }) => {
    const [products, setProducts] = useState<Record<string, InventoryProduct>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            const productMap: Record<string, InventoryProduct> = {};

            const promises = purchaseOrder.items
                .filter(item => item.productId)
                .map(async (item) => {
                    const result = await getProduct(item.productId!);
                    if (result.success && result.data) {
                        productMap[item.productId!] = result.data;
                    }
                });

            await Promise.all(promises);
            setProducts(productMap);
            setLoading(false);
        };

        loadProducts();
    }, [purchaseOrder.items]);

    // Get all unique stores across all products in this PO
    const allStores = useMemo(() => {
        const stores = new Set<string>();
        Object.values(products).forEach(product => {
            product.priceEntries?.forEach(entry => {
                if (entry.store) stores.add(entry.store);
            });
        });
        return Array.from(stores).sort();
    }, [products]);

    // Calculate cheapest store for each item and overall recommendation
    const shoppingData = useMemo(() => {
        const items = purchaseOrder.items.filter(item => item.productId && products[item.productId]);

        const storeCheapestCount: Record<string, number> = {};
        allStores.forEach(s => storeCheapestCount[s] = 0);

        const processedItems = items.map(item => {
            const product = products[item.productId!];
            const prices: Record<string, number> = {};
            let minPrice = Infinity;
            let cheapestStore = '';

            product.priceEntries?.forEach(entry => {
                prices[entry.store] = entry.price;
                if (entry.price < minPrice) {
                    minPrice = entry.price;
                    cheapestStore = entry.store;
                }
            });

            if (cheapestStore) {
                storeCheapestCount[cheapestStore] = (storeCheapestCount[cheapestStore] || 0) + 1;
            }

            return {
                ...item,
                prices,
                cheapestStore,
                minPrice
            };
        });

        // Find store with most cheapest items
        let recommendedStore = '';
        let maxCheapest = -1;
        Object.entries(storeCheapestCount).forEach(([store, count]) => {
            if (count > maxCheapest) {
                maxCheapest = count;
                recommendedStore = store;
            }
        });

        return { processedItems, recommendedStore, storeCheapestCount };
    }, [products, allStores, purchaseOrder.items]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Loading price data...</span>
            </div>
        );
    }

    if (shoppingData.processedItems.length === 0) {
        return (
            <div className="text-center p-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No linked inventory items found.</p>
                <p className="text-sm text-gray-400">Add items from inventory to see store price comparisons.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Recommendation Header */}
            {shoppingData.recommendedStore && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="bg-green-100 p-2 rounded-full">
                        <Star className="w-6 h-6 text-green-600 fill-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-green-800">Smart Recommendation</h3>
                        <p className="text-green-700 text-sm">
                            We recommend buying from <span className="font-bold underline">{shoppingData.recommendedStore}</span>.
                            They have the best price for {shoppingData.storeCheapestCount[shoppingData.recommendedStore]} of your {shoppingData.processedItems.length} items.
                        </p>
                    </div>
                </div>
            )}

            {/* Shopping List Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                Product Name
                            </th>
                            {allStores.map(store => (
                                <th key={store} className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-l border-gray-200">
                                    {store}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {shoppingData.processedItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 group-hover:bg-gray-50">
                                    {item.productName}
                                </td>
                                {allStores.map(store => {
                                    const price = item.prices[store];
                                    const isCheapest = store === item.cheapestStore;

                                    return (
                                        <td
                                            key={store}
                                            className={`px-6 py-4 whitespace-nowrap text-center text-sm border-l border-gray-100 ${isCheapest ? 'bg-green-50/50' : ''
                                                }`}
                                        >
                                            {price !== undefined ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`font-medium ${isCheapest ? 'text-green-700' : 'text-gray-700'}`}>
                                                        ${price.toFixed(2)}
                                                    </span>
                                                    {isCheapest && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-tight">
                                                            Best Deal
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 italic text-xs">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Prices are based on historical records and manual entries.</span>
            </div>
        </div>
    );
};

export default ShoppingListTab;
