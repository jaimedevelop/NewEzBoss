import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

interface TimeHeaderProps {
  onAddRole: () => void;
}

export const TimeHeader: React.FC<TimeHeaderProps> = ({ onAddRole }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left side - Back button and title */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/labor')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Time-Based Labor</h1>
              <p className="text-sm text-gray-500 mt-1">Hourly rates for different roles and skill levels</p>
            </div>
          </div>

          {/* Right side - Add button */}
          <button
            onClick={onAddRole}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Role</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeHeader;