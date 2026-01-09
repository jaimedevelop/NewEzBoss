// src/pages/inventory/products/components/productModal/HistoryTab.tsx
import React from 'react';
import { Clock, Package } from 'lucide-react';

interface HistoryTabProps {
  disabled?: boolean;
}

const HistoryTab: React.FC<HistoryTabProps> = () => {
  // TODO: Integrate with product context when available
  // For now, show informative placeholder
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Package className="w-16 h-16 text-blue-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase History</h3>
      <p className="text-gray-500 text-center max-w-md mb-4">
        Purchase history tracking is now available! When items are received from purchase orders,
        the history will appear here showing:
      </p>
      <ul className="text-sm text-gray-600 space-y-1 text-left">
        <li>• Purchase order numbers with links</li>
        <li>• Purchase dates and quantities</li>
        <li>• Unit prices and total costs</li>
        <li>• Supplier information</li>
        <li>• Summary statistics</li>
      </ul>
      <div className="mt-6 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <Clock className="w-4 h-4 inline mr-1" />
        History will populate automatically when purchase orders are received
      </div>
    </div>
  );
};

export default HistoryTab;

