import React from 'react';
import type { Estimate, EstimateGroup, ClientViewSettings, LineItem } from '../../../services/estimates/estimates.types';
import { getDocumentIdentity } from '../../../services/estimates/documentIdentity';

interface MobileEstimateDocProps {
  estimate: Estimate;
  settings: ClientViewSettings;
  groups: EstimateGroup[];
  companyInfo?: {
    companyName?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    logoUrl?: string;
  };
}

const MobileEstimateDoc: React.FC<MobileEstimateDocProps> = ({ estimate, settings, groups, companyInfo }) => {
  const identity = getDocumentIdentity(estimate);
  const groupedItems = React.useMemo(() => {
    const result: Record<string, LineItem[]> = {};

    if (settings.displayMode === 'list') {
      result['General'] = estimate.lineItems;
    } else if (settings.displayMode === 'byType') {
      const totalsByType: Record<string, number> = {};
      const itemTypes: Record<string, string> = {
        product: 'Materials',
        labor: 'Labor',
        tool: 'Tools & Equipment',
        equipment: 'Tools & Equipment',
      };

      estimate.lineItems.forEach(item => {
        if (settings.hiddenLineItems?.includes(item.id)) return;
        const category = itemTypes[item.type as string] || 'Other';
        totalsByType[category] = (totalsByType[category] || 0) + (item.total || 0);
      });

      Object.entries(totalsByType).forEach(([category, total]) => {
        result[category] = [{
          id: `summary-${category}`,
          description: category,
          total,
          quantity: 1,
          unitPrice: total,
          type: 'custom',
          isConsolidated: true,
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

  const calculateGroupTotal = (items: LineItem[]) =>
    items
      .filter(item => !settings.hiddenLineItems?.includes(item.id))
      .reduce((sum, item) => sum + item.total, 0);

  const subtotal = estimate.lineItems
    .filter(item => !settings.hiddenLineItems?.includes(item.id))
    .reduce((sum, item) => sum + item.total, 0);

  const discountAmount = estimate.discountType === 'percentage'
    ? subtotal * ((estimate.discount || 0) / 100)
    : estimate.discount || 0;
  const taxableSubtotal = subtotal - discountAmount;
  const tax = estimate.taxRate ? (taxableSubtotal * estimate.taxRate) / 100 : 0;
  const total = taxableSubtotal + tax;

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{identity.title}</h1>
            <p className="text-gray-500 mt-0.5 uppercase tracking-widest text-xs">#{identity.primaryNumber}</p>
            {estimate.estimateState === 'invoice' && estimate.estimateNumber && <p className="text-gray-400 mt-1 text-[10px]">Estimate reference #{estimate.estimateNumber}</p>}
          </div>
          {companyInfo?.logoUrl ? (
            <img src={companyInfo.logoUrl} alt="Company Logo" className="w-12 h-12 object-contain flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex-shrink-0" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</p>
            <p className="font-semibold text-gray-900">{companyInfo?.companyName || 'Your Company Name'}</p>
            <p className="text-gray-500 text-xs">{companyInfo?.address}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</p>
            <p className="font-semibold text-gray-900">{estimate.customerName || 'Client Name'}</p>
            {estimate.serviceAddress && <p className="text-gray-500 text-xs">{estimate.serviceAddress}</p>}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="px-4 py-4 space-y-6">
        {Object.entries(groupedItems).map(([groupName, items]) => {
          const visibleItems = items.filter(item => !settings.hiddenLineItems?.includes(item.id));
          if (visibleItems.length === 0) return null;

          const groupTotal = calculateGroupTotal(items);
          const groupSettings = groups.find(g => g.name === groupName);
          const showGroupPrice = settings.showGroupPrices && (groupSettings?.showPrice ?? true) && settings.displayMode !== 'byType';
          const showHeader = settings.displayMode !== 'byType';

          return (
            <div key={groupName}>
              {showHeader && (
                <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2 mb-2">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{groupName}</h3>
                  {showGroupPrice && (
                    <span className="text-sm font-bold text-gray-900">${groupTotal.toFixed(2)}</span>
                  )}
                </div>
              )}
              <div className="divide-y divide-gray-100">
                {visibleItems.map(item => {
                  const isConsolidated = (item as any).isConsolidated;
                  return (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <p className="text-sm font-medium text-gray-900 pr-3">{item.description}</p>
                      {settings.showItemPrices && (
                        <div className="text-right flex-shrink-0">
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
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="px-4 py-5 bg-gray-50 border-t border-gray-100 space-y-2">
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
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3 mt-1">
            <span className="text-gray-900">Total</span>
            <span className="text-orange-600">${total.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileEstimateDoc;
