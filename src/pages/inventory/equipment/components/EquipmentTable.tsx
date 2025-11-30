// src/pages/inventory/equipment/components/EquipmentTable.tsx
import React from 'react';
import { Truck, Edit, Trash2, Eye, Copy, Package, Store } from 'lucide-react';
import { EquipmentItem } from '../../../../services/inventory/equipment';

interface EquipmentTableProps {
  equipment: EquipmentItem[];
  onEditEquipment: (equipment: EquipmentItem) => void;
  onDeleteEquipment: (equipmentId: string) => void;
  onViewEquipment: (equipment: EquipmentItem) => void;
  onDuplicateEquipment?: (equipment: EquipmentItem) => void;
  loading?: boolean;
}

const EquipmentTable: React.FC<EquipmentTableProps> = ({
  equipment,
  onEditEquipment,
  onDeleteEquipment,
  onViewEquipment,
  onDuplicateEquipment,
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

  const getEquipmentTypeBadge = (type: string) => {
    const typeConfig = {
      'owned': { label: 'Owned', color: 'bg-blue-100 text-blue-800', icon: Package },
      'rented': { label: 'Rented', color: 'bg-green-100 text-green-800', icon: Store }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || { 
      label: type, 
      color: 'bg-gray-100 text-gray-800',
      icon: Package
    };

    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  const getCategoryPath = (item: EquipmentItem) => {
    const parts = [];
    if (item.tradeName) parts.push({ name: item.tradeName, color: 'bg-blue-100 text-blue-800' });
    if (item.sectionName) parts.push({ name: item.sectionName, color: 'bg-green-100 text-green-800' });
    if (item.categoryName) parts.push({ name: item.categoryName, color: 'bg-purple-100 text-purple-800' });
    if (item.subcategoryName) parts.push({ name: item.subcategoryName, color: 'bg-orange-100 text-orange-800' });
    return parts;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Equipment Inventory</h2>
          <p className="text-sm text-gray-600 mt-1">Loading equipment...</p>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading equipment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Equipment Inventory</h2>
        <p className="text-sm text-gray-600 mt-1">{equipment.length} equipment items</p>
      </div>

      {equipment.length === 0 ? (
        <div className="p-8 text-center">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No equipment found</h3>
          <p className="text-gray-500">Add your first equipment to get started with inventory management.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hierarchy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rental Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Charge</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipment.map((item) => {
                const categoryPath = getCategoryPath(item);
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</div>
                        <div className="text-xs text-gray-400 mt-1 max-w-xs text-break">{item.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
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
                    <td className="px-6 py-4 whitespace-nowrap">{getEquipmentTypeBadge(item.equipmentType)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 space-y-1">
                        {categoryPath.map((part, index) => (
                          <div key={index} className={`text-xs px-2 py-1 rounded ${part.color}`}>
                            {part.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.equipmentType === 'rented' ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{item.rentalStoreName || '-'}</div>
                          <div className="text-xs text-gray-500">{item.rentalStoreLocation || '-'}</div>
                          {item.dueDate && (
                            <div className="text-xs text-orange-600 mt-1">Due: {formatDate(item.dueDate)}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">
                          {item.isPaidOff ? 'Paid Off' : 'Active Loan'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${item.minimumCustomerCharge?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => onViewEquipment(item)} className="text-gray-400 hover:text-green-600 transition-colors" title="View Equipment">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => onEditEquipment(item)} className="text-gray-400 hover:text-green-600 transition-colors" title="Edit Equipment">
                          <Edit className="h-4 w-4" />
                        </button>
                        {onDuplicateEquipment && (
                          <button onClick={() => onDuplicateEquipment(item)} className="text-gray-400 hover:text-green-600 transition-colors" title="Duplicate Equipment">
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => item.id && onDeleteEquipment(item.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete Equipment">
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

export default EquipmentTable;