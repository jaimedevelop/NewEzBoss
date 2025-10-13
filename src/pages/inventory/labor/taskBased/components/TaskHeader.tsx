import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

interface TaskHeaderProps {
  onAddTask: () => void;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({ onAddTask }) => {
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
              <h1 className="text-2xl font-bold text-gray-900">Task-Based Labor</h1>
              <p className="text-sm text-gray-500 mt-1">Flat rate pricing for specific jobs</p>
            </div>
          </div>

          {/* Right side - Add button */}
          <button
            onClick={onAddTask}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskHeader;