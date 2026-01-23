import React from 'react';
import type { Estimate, EstimateGroup, ClientViewSettings, LineItem } from '../../../../../../services/estimates/estimates.types';
import { Package, Briefcase, Wrench, Truck, HelpCircle } from 'lucide-react';

interface ClientViewDocPreviewProps {
    estimate: Estimate;
    settings: ClientViewSettings;
    groups: EstimateGroup[];
    selectingGroupId?: string | null;
    onToggleItemInGroup?: (itemId: string, groupId: string) => void;
    companyInfo?: {
        companyName?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        logoUrl?: string;
    };
}

export const ClientViewDocPreview: React.FC<ClientViewDocPreviewProps> = ({
    estimate,
    settings,
    groups,
    selectingGroupId,
    onToggleItemInGroup,
    companyInfo
}) => {
    const getTypeIcon = (type?: string) => {
        switch (type) {
            case 'product': return <Package className="w-4 h-4 text-orange-500" />;
            case 'labor': return <Briefcase className="w-4 h-4 text-purple-500" />;
            case 'tool': return <Wrench className="w-4 h-4 text-blue-500" />;
            case 'equipment': return <Truck className="w-4 h-4 text-green-500" />;
            default: return <HelpCircle className="w-4 h-4 text-gray-400" />;
        }
    };

    const renderLineItem = (item: LineItem) => {
        if (settings.hiddenLineItems?.includes(item.id)) return null;

        const isConsolidated = (item as any).isConsolidated;
        const isSelected = selectingGroupId && item.groupId === selectingGroupId;

        return (
            <div
                key={item.id}
                className={`flex items-center justify-between py-3 border-b border-gray-100 last:border-0 transition-all ${selectingGroupId ? 'cursor-pointer hover:bg-orange-50/50 px-4 -mx-4 rounded-lg' : ''
                    }`}
                onClick={() => {
                    if (selectingGroupId && onToggleItemInGroup) {
                        onToggleItemInGroup(item.id, selectingGroupId);
                    }
                }}
            >
                <div className="flex items-center gap-3">
                    {selectingGroupId ? (
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
                            {isSelected && (
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[4px] stroke-current fill-none">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    ) : (
                        getTypeIcon(item.type)
                    )}
                    <div>
                        <p className={`text-sm font-medium ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>{item.description}</p>
                    </div>
                </div>
                {settings.showItemPrices && (
                    <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">${item.total.toFixed(2)}</p>
                        {!isConsolidated && (
                            <p className="text-[10px] text-gray-400">
                                {item.quantity} @ ${item.unitPrice.toFixed(2)}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const groupedItems = React.useMemo(() => {
        const result: Record<string, LineItem[]> = {};

        if (settings.displayMode === 'list') {
            result['General'] = estimate.lineItems;
        } else if (settings.displayMode === 'byType') {
            const totalsByType: Record<string, number> = {};
            const itemTypes: Record<string, string> = {
                'product': 'Materials',
                'labor': 'Labor',
                'tool': 'Tools & Equipment',
                'equipment': 'Tools & Equipment'
            };

            estimate.lineItems.forEach(item => {
                if (settings.hiddenLineItems?.includes(item.id)) return;

                const category = itemTypes[item.type as string] || 'Other';
                totalsByType[category] = (totalsByType[category] || 0) + (item.total || 0);
            });

            // Return summarized items
            Object.entries(totalsByType).forEach(([category, total]) => {
                // Determine icon type for the category
                let iconType: any = 'custom';
                if (category === 'Materials') iconType = 'product';
                else if (category === 'Labor') iconType = 'labor';
                else if (category === 'Tools & Equipment') iconType = 'tool';

                result[category] = [{
                    id: `summary-${category}`,
                    description: category,
                    total: total,
                    quantity: 1,
                    unitPrice: total,
                    type: iconType,
                    isConsolidated: true
                } as any];
            });
        } else if (settings.displayMode === 'byGroup') {
            estimate.lineItems.forEach(item => {
                const groupName = groups.find(g => g.id === item.groupId)?.name || 'General';
                if (!result[groupName]) result[groupName] = [];
                result[groupName].push(item);
            });
        }

        return result;
    }, [estimate.lineItems, settings.displayMode, groups]);

    const calculateGroupTotal = (items: LineItem[]) => {
        return items
            .filter(item => !settings.hiddenLineItems?.includes(item.id))
            .reduce((sum, item) => sum + item.total, 0);
    };

    const subtotal = estimate.lineItems
        .filter(item => !settings.hiddenLineItems?.includes(item.id))
        .reduce((sum, item) => sum + item.total, 0);

    const tax = estimate.taxRate ? (subtotal * estimate.taxRate) / 100 : 0;
    const total = subtotal + tax;

    return (
        <div className="w-full max-w-[800px] mx-auto bg-white shadow-2xl rounded-sm min-h-[1000px] flex flex-col">
            {/* Document Header */}
            <div className="p-12 border-b-2 border-gray-100">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">ESTIMATE</h1>
                        <p className="text-gray-500 mt-1 uppercase tracking-widest text-sm">#{estimate.estimateNumber || 'DRAFT'}</p>
                    </div>
                    <div className="text-right">
                        {companyInfo?.logoUrl ? (
                            <img src={companyInfo.logoUrl} alt="Company Logo" className="w-16 h-16 object-contain ml-auto mb-4" />
                        ) : (
                            <div className="w-16 h-16 bg-blue-600 rounded-xl ml-auto mb-4" />
                        )}
                        <p className="font-bold text-gray-900">{companyInfo?.companyName || 'Your Company Name'}</p>
                        <p className="text-sm text-gray-500">{companyInfo?.address || '123 Business Way'}</p>
                        <p className="text-sm text-gray-500">
                            {companyInfo?.city || 'City'}{companyInfo?.city && (companyInfo?.state || companyInfo?.zipCode) ? ', ' : ''}
                            {companyInfo?.state || 'State'} {companyInfo?.zipCode || '12345'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mt-12">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recipient</p>
                        <p className="font-bold text-gray-900">{estimate.customerName || 'Client Name'}</p>
                        <div className="text-sm text-gray-500">
                            {estimate.customerEmail && <p>{estimate.customerEmail}</p>}
                            {estimate.customerPhone && <p>{estimate.customerPhone}</p>}
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                            {estimate.serviceAddress && <p>{estimate.serviceAddress}</p>}
                            {estimate.serviceAddress2 && <p>{estimate.serviceAddress2}</p>}
                            {(estimate.serviceCity || estimate.serviceState || estimate.serviceZipCode) && (
                                <p>
                                    {estimate.serviceCity}{estimate.serviceCity && (estimate.serviceState || estimate.serviceZipCode) ? ', ' : ''}
                                    {estimate.serviceState} {estimate.serviceZipCode}
                                </p>
                            )}
                            {!estimate.serviceAddress && !estimate.serviceCity && <p>Service Address</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Date</p>
                        <p className="font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 p-12">
                <div className="space-y-10">
                    {Object.entries(groupedItems).map(([groupName, items]) => {
                        const visibleItems = items.filter(item => !settings.hiddenLineItems?.includes(item.id));
                        if (visibleItems.length === 0) return null;

                        const groupTotal = calculateGroupTotal(items);
                        const groupSettings = groups.find(g => g.name === groupName);
                        // Hide group prices if explicitly disabled OR if we are in byType mode (which is consolidated)
                        const showGroupPrice = settings.showGroupPrices && (groupSettings?.showPrice ?? true) && settings.displayMode !== 'byType';
                        const showHeader = settings.displayMode !== 'byType';

                        return (
                            <div key={groupName}>
                                {showHeader && (
                                    <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2 mb-4">
                                        <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">{groupName}</h3>
                                        {showGroupPrice && (
                                            <span className="text-base font-bold text-gray-900">${groupTotal.toFixed(2)}</span>
                                        )}
                                    </div>
                                )}
                                <div className="divide-y divide-gray-100">
                                    {items.map(renderLineItem)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Document Footer / Totals */}
            <div className="p-12 bg-gray-50 mt-auto border-t border-gray-100">
                <div className="w-full max-w-xs ml-auto space-y-3">
                    {settings.showSubtotal && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                        </div>
                    )}
                    {settings.showTax && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tax ({estimate.taxRate || 0}%)</span>
                            <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
                        </div>
                    )}
                    {settings.showTotal && (
                        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3 mt-3">
                            <span className="text-gray-900">Total</span>
                            <span className="text-blue-600">${total.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                        Thank you for your business!
                    </p>
                </div>
            </div>
        </div>
    );
};
