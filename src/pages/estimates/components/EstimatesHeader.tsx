import React from 'react';
import { Plus, FileText } from 'lucide-react';

interface EstimatesHeaderProps {
  onNewEstimate: () => void;
}

const EstimatesHeader: React.FC<EstimatesHeaderProps> = ({ onNewEstimate }) => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm text-white p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Estimates</h1>
            <p className="text-orange-100 text-lg">
              Create, manage, and track project estimates and proposals.
            </p>
          </div>
        </div>
        <button 
          onClick={onNewEstimate}
          className="mt-4 sm:mt-0 bg-white text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors flex items-center space-x-2 font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>New Estimate</span>
        </button>
      </div>
    </div>
  );
};

export default EstimatesHeader;