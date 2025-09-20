// src/pages/inventory/components/HistoryTab.tsx
import React from 'react';
import { Clock } from 'lucide-react';

const HistoryTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Clock className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase History</h3>
      <p className="text-gray-500 text-center max-w-md">
        For Future Development when the Purchasing section is created.
      </p>
      <p className="text-gray-400 text-sm mt-2">
        This will show purchase orders, vendor history, and cost tracking.
      </p>
    </div>
  );
};

export default HistoryTab;