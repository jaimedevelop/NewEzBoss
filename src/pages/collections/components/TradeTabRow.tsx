// src/pages/collections/components/TradeTabRow.tsx
import React from 'react';
import { Hammer } from 'lucide-react';
import type { CategoryTab, CollectionContentType } from '../../../services/collections';

interface TradeTabRowProps {
  contentType: CollectionContentType;
  categoryTabs: CategoryTab[];
  selectedTrade: string | null;
  onTradeChange: (trade: string | null) => void;
}

const UNASSIGNED_TRADE = '__unassigned__';

// TODO: this row currently only applies to 'products', the only content type whose
// tabs carry tradeName today. Extend to labor/tools/equipment once their items/sections
// carry trade info and CategoryTab.tradeName is populated for those types too.
const TradeTabRow: React.FC<TradeTabRowProps> = ({
  contentType,
  categoryTabs,
  selectedTrade,
  onTradeChange,
}) => {
  if (contentType !== 'products') return null;

  const filteredTabs = categoryTabs.filter(tab => tab.type === contentType);

  const trades = React.useMemo(() => {
    const names = new Set<string>();
    let hasUnassigned = false;
    filteredTabs.forEach(tab => {
      if (tab.tradeName) names.add(tab.tradeName);
      else hasUnassigned = true;
    });
    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));
    return hasUnassigned ? [...sorted, UNASSIGNED_TRADE] : sorted;
  }, [filteredTabs]);

  console.log('🔍 [TradeTabRow] render', {
    contentType,
    filteredTabsCount: filteredTabs.length,
    tabTradeNames: filteredTabs.map(t => ({ id: t.id, category: t.category, tradeName: t.tradeName })),
    resolvedTrades: trades,
  });

  if (trades.length === 0) return null;

  const getTabCount = (trade: string) =>
    filteredTabs.filter(tab => (tab.tradeName || UNASSIGNED_TRADE) === trade).length;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {trades.map(trade => {
          const isActive = selectedTrade === trade || (selectedTrade === null && trades.length === 1);
          const label = trade === UNASSIGNED_TRADE ? 'Unassigned' : trade;
          const count = getTabCount(trade);

          return (
            <button
              key={trade}
              onClick={() => onTradeChange(trade)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? 'bg-teal-50 border-teal-500 text-teal-700'
                  : 'bg-transparent border-transparent text-gray-600 hover:bg-teal-50 hover:text-teal-600'
                }
              `}
            >
              <Hammer className={`w-4 h-4 ${isActive ? 'text-teal-500' : 'text-gray-400'}`} />
              <span className="text-sm font-semibold">{label}</span>
              {count > 0 && (
                <span className={`
                  px-1.5 py-0.5 text-xs rounded-full font-bold
                  ${isActive ? 'bg-teal-200 text-teal-800' : 'bg-gray-200 text-gray-600'}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TradeTabRow;
