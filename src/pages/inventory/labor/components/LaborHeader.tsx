import React from 'react';
import { ArrowLeft, Plus, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LaborHeaderProps {
  onAddItem: () => void;
}

export const LaborHeader: React.FC<LaborHeaderProps> = ({ onAddItem }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left side - Back button and title */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Labor Management</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage flat rates, hourly rates, and task orders
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Add button */}
          <button
            onClick={onAddItem}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Labor Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LaborHeader;