import React from 'react';
import { Plus } from 'lucide-react';

interface ProjectsHeaderProps {
  onNewProject: () => void;
}

const ProjectsHeader: React.FC<ProjectsHeaderProps> = ({ onNewProject }) => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm text-white p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Projects</h1>
          <p className="text-orange-100 text-lg">
            Manage and track all your construction projects in one place.
          </p>
        </div>
        <button 
          onClick={onNewProject}
          className="mt-4 sm:mt-0 bg-white text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors flex items-center space-x-2 font-medium shadow-sm"
        >
          <Plus className="h-5 w-5" />
          <span>New Project</span>
        </button>
      </div>
    </div>
  );
};

export default ProjectsHeader;