// src/pages/collections/components/CollectionsScreen/components/SectionTabView.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Maximize2, AlertCircle, Package } from 'lucide-react';
import type {
    CategoryTab,
    CollectionContentType,
    ItemSelection
} from '../../../../../services/collections';
import { Alert } from '../../../../../mainComponents/ui/Alert';

interface SectionTabViewProps {
    contentType: CollectionContentType;
    sectionName: string;
    categoryTabs: CategoryTab[];
    allItems: any[];
    selections: Record<string, ItemSelection>;
    isLoading: boolean;
    loadError: string | null;
    onToggleSelection: (itemId: string) => void;
    onQuantityChange: (itemId: string, quantity: number) => void;
    onLaborHoursChange?: (itemId: string, hours: number) => void;
    filterState: any;
    onExpandSection: () => void;
}

const SectionTabView: React.FC<SectionTabViewProps> = ({
    contentType,
    sectionName,
    categoryTabs,
    allItems,
    selections,
    isLoading,
    loadError,
    onToggleSelection,
    onQuantityChange,
    onLaborHoursChange,
    filterState,
    onExpandSection,
}) => {
    const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

    // Apply filters to items
    const filteredItems = useMemo(() => {
        if (!filterState) return allItems;

        return allItems.filter(item => {
            // Search filter
            if (filterState.searchTerm) {
                const searchLower = filterState.searchTerm.toLowerCase();
                const matchesSearch =
                    item.name?.toLowerCase().includes(searchLower) ||
                    item.description?.toLowerCase().includes(searchLower) ||
                    item.sku?.toLowerCase().includes(searchLower) ||
                    item.skus?.[0]?.sku?.toLowerCase().includes(searchLower);

                if (!matchesSearch) return false;
            }

            // Size filter (products only)
            if (filterState.sizeFilter && contentType === 'products') {
                if (item.size !== filterState.sizeFilter) return false;
            }

            // Stock filter (products only)
            if (filterState.stockFilter && contentType === 'products') {
                const onHand = item.onHand || 0;
                const minStock = item.minStock || 0;

                switch (filterState.stockFilter) {
                    case 'In Stock':
                        if (onHand <= minStock) return false;
                        break;
                    case 'Low Stock':
                        if (onHand === 0 || onHand > minStock) return false;
                        break;
                    case 'Out of Stock':
                        if (onHand > 0) return false;
                        break;
                }
            }

            // Location filter
            if (filterState.locationFilter) {
                if (item.location !== filterState.locationFilter) return false;
            }

            return true;
        });
    }, [allItems, filterState, contentType]);

    // Group items by category
    const itemsByCategory = useMemo(() => {
        const grouped = new Map<string, any[]>();

        categoryTabs.forEach(tab => {
            const categoryItems = filteredItems.filter(item => tab.itemIds.includes(item.id));
            if (categoryItems.length > 0) {
                grouped.set(tab.id, categoryItems);
            }
        });

        return grouped;
    }, [categoryTabs, filteredItems]);

    // Calculate totals
    const selectedCount = filteredItems.filter(item => selections[item.id]?.isSelected).length;
    const totalValue = filteredItems
        .filter(item => selections[item.id]?.isSelected)
        .reduce((sum, item) => {
            const selection = selections[item.id];
            const price = getItemPrice(item, contentType, selection);
            return sum + (price * (selection?.quantity || 0));
        }, 0);

    // Quantity handlers
    const handleQuantityChange = useCallback((itemId: string, value: string) => {
        const numValue = parseInt(value) || 1;
        const clampedValue = Math.max(1, numValue);
        setLocalQuantities(prev => ({ ...prev, [itemId]: clampedValue }));
    }, []);

    const handleQuantityBlur = useCallback((itemId: string) => {
        const localQty = localQuantities[itemId];
        if (localQty !== undefined) {
            onQuantityChange(itemId, localQty);
            setLocalQuantities(prev => {
                const { [itemId]: removed, ...rest } = prev;
                return rest;
            });
        }
    }, [localQuantities, onQuantityChange]);

    const handleQuantityKeyDown = useCallback((
        e: React.KeyboardEvent<HTMLInputElement>,
        itemId: string
    ) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }, []);

    const getDisplayQuantity = useCallback((itemId: string): number => {
        if (localQuantities[itemId] !== undefined) {
            return localQuantities[itemId];
        }
        return selections[itemId]?.quantity || 1;
    }, [localQuantities, selections]);

    if (loadError) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                        <p className="font-medium">Error Loading Items</p>
                        <p className="text-sm">{loadError}</p>
                    </div>
                </Alert>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading items...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <h3 className="font-semibold text-gray-900">Section: {sectionName}</h3>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                            {categoryTabs.length} {categoryTabs.length === 1 ? 'category' : 'categories'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                            <span className="font-semibold text-orange-600">{selectedCount}</span> of{' '}
                            <span className="font-semibold">{filteredItems.length}</span> selected
                        </span>
                        {selectedCount > 0 && (
                            <>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">
                                    Total: <span className="font-semibold">${totalValue.toFixed(2)}</span>
                                </span>
                            </>
                        )}
                    </div>
                    <button
                        onClick={onExpandSection}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                        title="Expand into individual category tabs"
                    >
                        <Maximize2 className="w-4 h-4" />
                        <span className="font-medium">Expand Section</span>
                    </button>
                </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-auto">
                {itemsByCategory.size === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Package className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium mb-1">
                            {allItems.length === 0 ? `This section has no ${contentType}` : `No ${contentType} match your filters`}
                        </p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-2 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedCount === filteredItems.length && filteredItems.length > 0}
                                        onChange={() => {
                                            filteredItems.forEach(item => {
                                                const isCurrentlySelected = selections[item.id]?.isSelected;
                                                if (selectedCount === filteredItems.length) {
                                                    if (isCurrentlySelected) onToggleSelection(item.id);
                                                } else {
                                                    if (!isCurrentlySelected) onToggleSelection(item.id);
                                                }
                                            });
                                        }}
                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                </th>
                                {renderTableHeaders(contentType)}
                                <th className="px-4 py-2 w-24">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {categoryTabs.map(tab => {
                                const items = itemsByCategory.get(tab.id) || [];
                                if (items.length === 0) return null;

                                const categorySelectedCount = items.filter(item => selections[item.id]?.isSelected).length;

                                return (
                                    <React.Fragment key={tab.id}>
                                        {/* Category Divider */}
                                        <tr className="bg-blue-50 border-y border-blue-200">
                                            <td colSpan={getColumnCount(contentType)} className="px-4 py-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                                                        {tab.name}
                                                    </span>
                                                    <span className="text-xs text-blue-700">
                                                        {categorySelectedCount} / {items.length} selected
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Category Items */}
                                        {items.map(item => (
                                            <tr
                                                key={item.id}
                                                className={`
                                                    hover:bg-gray-50 transition-colors border-b border-gray-100
                                                    ${selections[item.id]?.isSelected ? 'bg-orange-50' : ''}
                                                `}
                                            >
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selections[item.id]?.isSelected || false}
                                                        onChange={() => onToggleSelection(item.id)}
                                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                                    />
                                                </td>
                                                {renderTableCells(item, contentType, selections[item.id])}
                                                <td className="px-4 py-2">
                                                    {selections[item.id]?.isSelected ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={getDisplayQuantity(item.id)}
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                            onBlur={() => handleQuantityBlur(item.id)}
                                                            onKeyDown={(e) => handleQuantityKeyDown(e, item.id)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-orange-500 focus:border-orange-500"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// ===== HELPER FUNCTIONS =====

function getItemPrice(item: any, contentType: CollectionContentType, selection?: ItemSelection): number {
    if (selection?.unitPrice) return selection.unitPrice;

    switch (contentType) {
        case 'products':
            if (item?.priceEntries && Array.isArray(item.priceEntries) && item.priceEntries.length > 0) {
                const maxPrice = Math.max(...item.priceEntries.map((entry: any) => entry.price || 0));
                return maxPrice;
            }
            return item?.unitPrice || 0;
        case 'labor':
            return item?.flatRates?.[0]?.rate || item?.hourlyRates?.[0]?.hourlyRate || 0;
        case 'tools':
        case 'equipment':
            return item?.minimumCustomerCharge || 0;
        default:
            return 0;
    }
}

function getDisplayPrice(item: any, contentType: CollectionContentType): number {
    if (contentType === 'products') {
        if (item?.priceEntries && Array.isArray(item.priceEntries) && item.priceEntries.length > 0) {
            const maxPrice = Math.max(...item.priceEntries.map((entry: any) => entry.price || 0));
            return maxPrice;
        }
        return item?.unitPrice || 0;
    }

    if (contentType === 'labor') {
        return item?.flatRates?.[0]?.rate || item?.hourlyRates?.[0]?.hourlyRate || 0;
    }

    if (contentType === 'tools' || contentType === 'equipment') {
        return item?.minimumCustomerCharge || 0;
    }

    return 0;
}

function getColumnCount(contentType: CollectionContentType): number {
    switch (contentType) {
        case 'products':
            return 8;
        case 'labor':
            return 6;
        case 'tools':
        case 'equipment':
            return 8;
        default:
            return 5;
    }
}

function renderTableHeaders(contentType: CollectionContentType) {
    switch (contentType) {
        case 'products':
            return (
                <>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Image</th>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Stock</th>
                    <th className="px-4 py-2">Location</th>
                </>
            );
        case 'labor':
            return (
                <>
                    <th className="px-4 py-2">Labor Item</th>
                    <th className="px-4 py-2">Rate Type</th>
                    <th className="px-4 py-2">Est. Hours</th>
                    <th className="px-4 py-2">Price</th>
                </>
            );
        case 'tools':
        case 'equipment':
            return (
                <>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Image</th>
                    <th className="px-4 py-2">Brand</th>
                    <th className="px-4 py-2">Min Charge</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Location</th>
                </>
            );
        default:
            return null;
    }
}

function renderTableCells(
    item: any,
    contentType: CollectionContentType,
    selection?: ItemSelection
) {
    switch (contentType) {
        case 'products':
            return (
                <>
                    <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</div>
                        )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                            {item.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.currentTarget.src = '';
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = `
                                            <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        `;
                                    }}
                                />
                            ) : (
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                        {item.skus?.[0]?.sku || item.sku || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                        ${getDisplayPrice(item, contentType).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                        <div className={`text-sm font-medium ${item.onHand === 0 ? 'text-red-600' : item.onHand <= item.minStock ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {item.onHand || 0}
                        </div>
                        <div className="text-xs text-gray-500">Avail: {item.available || 0}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.location || '-'}</td>
                </>
            );

        case 'labor':
            return (
                <>
                    <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</div>
                        )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                        {item.flatRates?.length > 0 && item.hourlyRates?.length > 0 ? 'Both' :
                            item.flatRates?.length > 0 ? 'Flat' :
                                item.hourlyRates?.length > 0 ? 'Hourly' : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                        {item.estimatedHours > 0 ? `${item.estimatedHours}h` : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        ${(item.flatRates?.[0]?.rate || item.hourlyRates?.[0]?.hourlyRate || selection?.unitPrice || 0).toFixed(2)}
                    </td>
                </>
            );

        case 'tools':
        case 'equipment':
            return (
                <>
                    <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</div>
                        )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                            {item.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.currentTarget.src = '';
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = `
                                            <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        `;
                                    }}
                                />
                            ) : (
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                        {item.brand || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        ${(item.minimumCustomerCharge || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'available' ? 'bg-green-100 text-green-800' :
                            item.status === 'in-use' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {item.status || 'available'}
                        </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.location || '-'}</td>
                </>
            );

        default:
            return null;
    }
}

export default SectionTabView;