import React from 'react';
import type { Estimate, EstimateGroup, ClientViewSettings, LineItem } from '../../../../../../services/estimates/estimates.types';
import { getDocumentIdentity } from '../../../../../../services/estimates/documentIdentity';
import type { Client } from '../../../../../../services/clients';
// TODO: bring back Package, Briefcase, Wrench, Truck, HelpCircle icons for line item types when inventory/collections are reconnected

interface ClientViewDocPreviewProps {
    estimate: Estimate;
    client?: Client | null;
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
        phone?: string;
        website?: string;
        email?: string;
        licenses?: { type: string; number: string }[];
    };
}

export const ClientViewDocPreview: React.FC<ClientViewDocPreviewProps> = ({
    estimate,
    client,
    settings,
    groups,
    selectingGroupId,
    onToggleItemInGroup,
    companyInfo
}) => {
    const identity = getDocumentIdentity(estimate);
    const pictures = settings.addImagesToEstimate ? (estimate.pictures ?? []) : [];
    const renderLineItem = (item: LineItem) => {
        if (settings.hiddenLineItems?.includes(item.id)) return null;

        const isConsolidated = (item as any).isConsolidated;
        const isSelected = selectingGroupId && item.groupId === selectingGroupId;

        return (
            <div
                key={item.id}
                className={`flex items-center gap-6 py-3 border-b border-gray-100 last:border-0 transition-all ${selectingGroupId ? 'cursor-pointer hover:bg-orange-50/50 px-4 -mx-4 rounded-lg' : ''
                    }`}
                onClick={() => {
                    if (selectingGroupId && onToggleItemInGroup) {
                        onToggleItemInGroup(item.id, selectingGroupId);
                    }
                }}
            >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    {selectingGroupId && (
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
                            {isSelected && (
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[4px] stroke-current fill-none">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    )}
                    {/* TODO: bring back line item type icon (product/labor/tool/equipment) when inventory/collections are reconnected */}
                    <div className="min-w-0 flex-1">
                        <p className={`break-words text-sm font-medium ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>{item.description}</p>
                    </div>
                </div>
                {settings.showItemPrices && (
                    <div className="w-28 shrink-0 text-right">
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

    // Customer line items may be redacted; use the authoritative summary.
    const subtotal = estimate.subtotal;
    const discountAmount = estimate.discountType === 'percentage'
      ? subtotal * ((estimate.discount || 0) / 100)
      : estimate.discount || 0;
    const tax = estimate.tax;
    const total = estimate.total;

    return (
        <div className="w-full max-w-[800px] mx-auto">
        <div data-pdf-page="estimate" className="w-full bg-white shadow-2xl rounded-sm min-h-[1000px] flex flex-col">
            {/* Document Header */}
            <div className="p-12 border-b-2 border-gray-100">
                <div className="grid grid-cols-2 gap-12 items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{identity.title}</h1>
                        <p className="text-gray-500 mt-1 uppercase tracking-widest text-sm">#{identity.primaryNumber}</p>
                        {estimate.estimateState === 'invoice' && estimate.estimateNumber && <p className="text-gray-400 mt-1 text-xs">Estimate reference #{estimate.estimateNumber}</p>}
                        <div className="mt-8">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recipient</p>
                            <p className="font-bold text-gray-900">{estimate.customerName || 'Client Name'}</p>
                            <div className="text-sm text-gray-500">
                                {estimate.customerEmail && <p>{estimate.customerEmail}</p>}
                                {estimate.customerPhone && <p>{estimate.customerPhone}</p>}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-6 text-sm text-gray-500">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Address</p>
                                    <AddressLines
                                        address={client?.billingAddress || estimate.serviceAddress}
                                        address2={client?.billingAddress2 || estimate.serviceAddress2}
                                        city={client?.billingCity || estimate.serviceCity}
                                        state={client?.billingState || estimate.serviceState}
                                        zipCode={client?.billingZipCode || estimate.serviceZipCode}
                                        placeholder="Billing Address"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Address</p>
                                    <AddressLines
                                        address={estimate.serviceAddress}
                                        address2={estimate.serviceAddress2}
                                        city={estimate.serviceCity}
                                        state={estimate.serviceState}
                                        zipCode={estimate.serviceZipCode}
                                        placeholder="Service Address"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        {companyInfo?.logoUrl ? (
                            <img src={companyInfo.logoUrl} alt="Company Logo" className="w-16 h-16 object-contain ml-auto mb-4" />
                        ) : (
                            <div className="w-16 h-16 bg-orange-600 rounded-xl ml-auto mb-4" />
                        )}
                        <p className="font-bold text-gray-900">{companyInfo?.companyName || 'Your Company Name'}</p>
                        <p className="text-sm text-gray-500">{companyInfo?.address || '123 Business Way'}</p>
                        {(companyInfo?.city || companyInfo?.state || companyInfo?.zipCode) && (
                            <p className="text-sm text-gray-500">
                                {companyInfo.city}{companyInfo.city && (companyInfo.state || companyInfo.zipCode) ? ', ' : ''}
                                {companyInfo.state} {companyInfo.zipCode}
                            </p>
                        )}
                        {companyInfo?.phone && (
                            <p className="text-sm text-gray-500">{companyInfo.phone}</p>
                        )}
                        {companyInfo?.email && (
                            <p className="text-sm text-gray-500">{companyInfo.email}</p>
                        )}
                        {companyInfo?.website && (
                            <p className="text-sm text-gray-500">{companyInfo.website}</p>
                        )}
                        {companyInfo?.licenses && companyInfo.licenses.filter(l => l.number).length > 0 && (
                            <p className="text-[11px] text-gray-400 mt-1">
                                {companyInfo.licenses
                                    .filter(l => l.number)
                                    .map(l => (l.type ? `${l.type} License # ${l.number}` : `License # ${l.number}`))
                                    .join(' · ')}
                            </p>
                        )}
                        <div className="mt-3 text-sm text-gray-500">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                            <p className="font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
                        </div>
                        {estimate.poNumber && (
                            <div className="mt-3 text-sm text-gray-500">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">P.O. Number</p>
                                <p className="font-medium text-gray-900">{estimate.poNumber}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 p-12">
      {estimate.projectDescription?.trim() && <p className="mb-6 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{estimate.projectDescription}</p>}
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
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide leading-tight">{groupName}</h3>
                                            {groupSettings?.description && (
                                                <p className="text-[11px] text-gray-500 font-normal normal-case mt-0.5">{groupSettings.description}</p>
                                            )}
                                        </div>
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
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                                Discount{estimate.discountType === 'percentage' ? ` (${estimate.discount}%)` : ''}
                            </span>
                            <span className="font-medium text-green-700">-${discountAmount.toFixed(2)}</span>
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
                            <span className="text-orange-600">${total.toFixed(2)}</span>
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
        {pictures.length > 0 && pictures.map((picture, index) => (
                <section key={picture.id} data-pdf-page={index === 0 ? 'pictures' : `picture-${index + 1}`} className="estimate-pictures-page mt-6 w-full bg-white shadow-2xl rounded-sm min-h-[1000px] p-12">
                    {index === 0 && <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-8">Pictures</h1>}
                    <figure className="break-inside-avoid">
                        <img src={picture.url} alt={picture.description || 'Estimate picture'} className="w-full max-h-[650px] object-contain" crossOrigin="anonymous" />
                        {picture.description?.trim() && <figcaption className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{picture.description}</figcaption>}
                    </figure>
                </section>
            ))}
        </div>
    );
};

const AddressLines: React.FC<{
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    placeholder: string;
}> = ({ address, address2, city, state, zipCode, placeholder }) => {
    if (!address && !address2 && !city && !state && !zipCode) return <p>{placeholder}</p>;
    return (
        <>
            {address && <p>{address}</p>}
            {address2 && <p>{address2}</p>}
            {(city || state || zipCode) && (
                <p>
                    {city}{city && (state || zipCode) ? ', ' : ''}
                    {state}{state && zipCode ? ' ' : ''}{zipCode}
                </p>
            )}
        </>
    );
};
