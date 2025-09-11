import React from 'react';
import { Package, AlertTriangle, Lock } from 'lucide-react';

const InventoryAlerts: React.FC = () => {
  // MVP version - disabled state with placeholder
  const isDisabled = true;

  if (isDisabled) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Inventory Alerts</h2>
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Management</h3>
            <p className="text-gray-600 mb-4">
              Track materials, tools, and equipment across all your projects.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">
                This feature will include:
              </p>
              <ul className="text-sm text-gray-500 mt-2 space-y-1">
                <li>• Low stock alerts</li>
                <li>• Reorder notifications</li>
                <li>• Material usage tracking</li>
                <li>• Supplier management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This would be the active version when enabled
  const alerts = [
    {
      id: 1,
      item: 'Portland Cement',
      currentStock: 8,
      minStock: 20,
      severity: 'high',
      supplier: 'BuildMart Supply'
    },
    {
      id: 2,
      item: 'Steel Rebar #4',
      currentStock: 12,
      minStock: 15,
      severity: 'medium',
      supplier: 'Metro Steel Co'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Inventory Alerts</h2>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
              alert.severity === 'high' ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  alert.severity === 'high' ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  Low Stock: {alert.item}
                </p>
                <p className={`text-xs ${
                  alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {alert.currentStock} remaining (min: {alert.minStock}) • {alert.supplier}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryAlerts;