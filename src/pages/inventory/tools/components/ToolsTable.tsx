// src/pages/inventory/tools/components/ToolTable.tsx
import React from 'react';
import { Wrench, Edit, Trash2, Eye, Copy } from 'lucide-react';
import { ToolItem } from '../../../../services/inventory/tools';

interface ToolTableProps {
  tools: ToolItem[];
  onEditTool: (tool: ToolItem) => void;
  onDeleteTool: (toolId: string) => void;
  onViewTool: (tool: ToolItem) => void;
  onDuplicateTool?: (tool: ToolItem) => void;
  loading?: boolean;
}

const ToolTable: React.FC<ToolTableProps> = ({
  tools,
  onEditTool,
  onDeleteTool,
  onViewTool,
  onDuplicateTool,
  loading = false
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'available': { label: 'Available', color: 'bg-green-100 text-green-800' },
      'in-use': { label: 'In Use', color: 'bg-blue-100 text-blue-800' },
      'maintenance': { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      color: 'bg-gray-100 text-gray-800' 
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryPath = (tool: ToolItem) => {
    const parts = [];
    if (tool.tradeName) parts.push({ name: tool.tradeName, color: 'bg-blue-100 text-blue-800' });
    if (tool.sectionName) parts.push({ name: tool.sectionName, color: 'bg-green-100 text-green-800' });
    if (tool.categoryName) parts.push({ name: tool.categoryName, color: 'bg-purple-100 text-purple-800' });
    if (tool.subcategoryName) parts.push({ name: tool.subcategoryName, color: 'bg-orange-100 text-orange-800' });
    return parts;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Tool Inventory</h2>
          <p className="text-sm text-gray-600 mt-1">Loading tools...</p>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading tool data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Tool Inventory</h2>
        <p className="text-sm text-gray-600 mt-1">{tools.length} tools in inventory</p>
      </div>
      
      {tools.length === 0 ? (
        <div className="p-8 text-center">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tools found</h3>
          <p className="text-gray-500">Add your first tool to get started with inventory management.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Charge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tools.map((tool) => {
                const categoryPath = getCategoryPath(tool);
                
                return (
                  <tr key={tool.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                        <div className="text-xs text-gray-400 mt-1 max-w-xs">
                          {tool.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                        {tool.imageUrl ? (
                          <img
                            src={tool.imageUrl}
                            alt={tool.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
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
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 space-y-1">
                        {categoryPath.map((part, index) => (
                          <div 
                            key={index} 
                            className={`text-xs px-2 py-1 rounded ${part.color}`}
                          >
                            {part.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tool.brand || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(tool.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${tool.minimumCustomerCharge?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tool.location || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onViewTool(tool)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Tool"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditTool(tool)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Tool"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {onDuplicateTool && (
                          <button
                            onClick={() => onDuplicateTool(tool)}
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="Duplicate Tool"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => tool.id && onDeleteTool(tool.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Tool"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ToolTable;