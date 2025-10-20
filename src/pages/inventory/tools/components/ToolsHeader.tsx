import React from 'react';
import { Plus, Wrench, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToolsHeaderProps {
  onAddTool: () => void;
}

const ToolsHeader: React.FC<ToolsHeaderProps> = ({ onAddTool }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm text-white p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/inventory')}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors group"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </button>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <Wrench className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Tool Management</h1>
            <p className="text-blue-100 text-lg">
              Track tools and equipment inventory across your projects.
            </p>
          </div>
        </div>
        <button 
          onClick={onAddTool}
          className="mt-4 sm:mt-0 bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2 font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>Add Tool</span>
        </button>
      </div>
    </div>
  );
};

export default ToolsHeader;