// src/pages/labor/components/LaborTable.tsx
import React from 'react';
import { Pencil, Trash2, Eye, Copy, Search } from 'lucide-react';
import { LaborItem } from '../../../../services/inventory/labor';
import PageSizeSelector from '../../../../mainComponents/ui/PageSizeSelector';
import PaginationControls from '../../../../mainComponents/ui/PaginationControls';

interface LaborTableProps {
  items: LaborItem[];
  loading: boolean;
  onView: (item: LaborItem) => void;
  onEdit: (item: LaborItem) => void;
  onDuplicate: (item: LaborItem) => void;
  onDelete: (itemId: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  searchMode: boolean;
}

export const LaborTable: React.FC<LaborTableProps> = ({ 
  items, 
  loading, 
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  pageSize,
  onPageSizeChange,
  currentPage,
  hasMore,
  onPageChange,
  searchMode
}) => {
  // Helper: Get hierarchy parts for colored badges
  const getHierarchyParts = (item: LaborItem): string[] => {
    const parts = [];
    if (item.tradeName) parts.push(item.tradeName);
    if (item.sectionName) parts.push(item.sectionName);
    if (item.categoryName) parts.push(item.categoryName);
    return parts;
  };

  // Helper: Get flat rate display info
  const getFlatRateInfo = (item: LaborItem): { display: string; isEmpty: boolean } => {
    if (!item.flatRates || item.flatRates.length === 0) {
      return { display: '-', isEmpty: true };
    }
    
    if (item.flatRates.length === 1) {
      const rate = item.flatRates[0];
      return { 
        display: `${rate.name}: $${rate.rate.toFixed(2)}`,
        isEmpty: false 
      };
    }
    
    const rates = item.flatRates.map(r => r.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    return { 
      display: `$${min.toFixed(2)}-$${max.toFixed(2)}`,
      isEmpty: false 
    };
  };

  // Helper: Get hourly rate display info
  const getHourlyRateInfo = (item: LaborItem): { rate: string; name: string; isEmpty: boolean } => {
    if (!item.hourlyRates || item.hourlyRates.length === 0) {
      return { rate: '-', name: '', isEmpty: true };
    }
    
    if (item.hourlyRates.length === 1) {
      const rate = item.hourlyRates[0];
      return { 
        rate: `$${rate.hourlyRate.toFixed(2)}/hr`,
        name: rate.name,
        isEmpty: false 
      };
    }
    
    const rates = item.hourlyRates.map(r => r.hourlyRate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    return { 
      rate: `$${min.toFixed(2)}-$${max.toFixed(2)}/hr`,
      name: `${item.hourlyRates.length} employees`,
      isEmpty: false 
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Labor Items</h2>
          <p className="text-sm text-gray-600 mt-1">
            {searchMode ? 'Searching all labor items...' : 'Loading labor items...'}
          </p>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">
            {searchMode ? 'Searching entire database...' : 'Loading labor items...'}
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Labor Items</h2>
          <p className="text-sm text-gray-600 mt-1">0 labor items</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-600">
            {searchMode 
              ? 'No labor items match your search criteria.' 
              : 'No labor items found. Create your first labor item to get started.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">Labor Items</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-600">
                {items.length} labor item{items.length !== 1 ? 's' : ''} displayed
              </p>
              {searchMode && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md">
                  <Search className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">
                    Showing all results
                  </span>
                </div>
              )}
            </div>
          </div>
          {!searchMode && (
            <PageSizeSelector 
              pageSize={pageSize} 
              onPageSizeChange={onPageSizeChange} 
              color="purple" 
            />
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hierarchy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flat Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hourly Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Est. Hours
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const hierarchyParts = getHierarchyParts(item);
              const flatRateInfo = getFlatRateInfo(item);
              const hourlyRateInfo = getHourlyRateInfo(item);

              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-400 mt-1 max-w-xs text-break">{item.description}</div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 space-y-1">
                      {hierarchyParts.map((part, index) => (
                        <div 
                          key={index} 
                          className={`text-xs px-2 py-1 rounded ${
                            index === 0 ? 'bg-blue-100 text-blue-800' :
                            index === 1 ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {part}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className={`text-sm ${flatRateInfo.isEmpty ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
                      {flatRateInfo.display}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {hourlyRateInfo.isEmpty ? (
                      <div className="text-sm text-gray-400">-</div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {hourlyRateInfo.rate}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {hourlyRateInfo.name}
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {item.tasks && item.tasks.length > 0 ? (
                      <div className="text-sm text-gray-900">
                        {item.tasks.length} {item.tasks.length === 1 ? 'task' : 'tasks'}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {item.estimatedHours ? (
                      <div className="text-sm text-gray-900">
                        {item.estimatedHours}h
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onView(item)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="View labor item"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="text-gray-400 hover:text-purple-600 transition-colors"
                        title="Edit labor item"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDuplicate(item)}
                        className="text-gray-400 hover:text-green-600 transition-colors"
                        title="Duplicate labor item"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => item.id && onDelete(item.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete labor item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Only show pagination when NOT in search mode */}
      {!searchMode && (
        <PaginationControls
          currentPage={currentPage}
          hasMore={hasMore}
          onPageChange={onPageChange}
          totalDisplayed={items.length}
          pageSize={pageSize}
          color="purple"
        />
      )}
      
      {/* Search mode footer message */}
      {searchMode && items.length > 0 && (
        <div className="px-6 py-3 bg-purple-50 border-t border-purple-100">
          <p className="text-sm text-purple-700 text-center">
            <span className="font-medium">Search active:</span> Pagination disabled while searching. Clear search to restore pagination.
          </p>
        </div>
      )}
    </div>
  );
};

export default LaborTable;