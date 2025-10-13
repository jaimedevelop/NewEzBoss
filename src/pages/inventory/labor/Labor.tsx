import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckSquare } from 'lucide-react';

export const Labor: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Labor Management</h1>
          <p className="text-lg text-gray-600">
            Manage your labor rates and task pricing
          </p>
        </div>

        {/* Two Main Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Task-Based Labor */}
          <button
            onClick={() => navigate('/labor/task-based')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500 text-left group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mb-6 group-hover:bg-blue-200 transition-colors">
              <CheckSquare className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Task-Based Labor</h2>
            <p className="text-gray-600 mb-4">
              Flat rate pricing for specific jobs and tasks
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Toilet Removal - $80
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Drain Cleaning - $150
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Toilet Installation - $120
              </div>
            </div>
          </button>

          {/* Time-Based Labor */}
          <button
            onClick={() => navigate('/labor/time-based')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-green-500 text-left group"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mb-6 group-hover:bg-green-200 transition-colors">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Time-Based Labor</h2>
            <p className="text-gray-600 mb-4">
              Hourly rates for different skill levels and roles
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Handyman Plumber - $20/hour
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Experienced Plumber - $30/hour
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Foreman Plumber - $40/hour
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Labor;