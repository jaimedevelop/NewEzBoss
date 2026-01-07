import React from 'react';

export type EstimateTypeFilter = 'all' | 'draft' | 'estimate' | 'change-order' | 'invoice';

interface EstimateTypeFilterProps {
  activeFilter: EstimateTypeFilter;
  onFilterChange: (filter: EstimateTypeFilter) => void;
  counts?: {
    all: number;
    draft: number;
    estimate: number;
    changeOrder: number;
    invoice: number;
  };
}

export const EstimateTypeFilterBar: React.FC<EstimateTypeFilterProps> = ({
  activeFilter,
  onFilterChange,
  counts
}) => {
  const tabs = [
    { id: 'all' as EstimateTypeFilter, label: 'All', count: counts?.all },
    { id: 'draft' as EstimateTypeFilter, label: 'Draft', count: counts?.draft },
    { id: 'estimate' as EstimateTypeFilter, label: 'Estimates', count: counts?.estimate },
    { id: 'change-order' as EstimateTypeFilter, label: 'Change-Orders', count: counts?.changeOrder },
    { id: 'invoice' as EstimateTypeFilter, label: 'Invoices', count: counts?.invoice }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`
              px-6 py-3 text-sm font-medium transition-colors relative
              ${activeFilter === tab.id
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {counts && tab.count !== undefined && (
                <span
                  className={`
                    px-2 py-0.5 text-xs rounded-full
                    ${activeFilter === tab.id
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
