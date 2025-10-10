import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Tools: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/inventory')}
          className="mb-8 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Inventory Hub
        </button>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Tools Page
          </h1>
          <p className="text-xl text-gray-600">
            Work in progress
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tools;