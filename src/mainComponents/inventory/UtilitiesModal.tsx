import React from 'react';
import { X, FolderTree, AlertCircle, LucideIcon } from 'lucide-react';

interface Utility {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  available: boolean;
}

interface UtilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryManagerClick: () => void;
  onEmptyCategoryCheckClick: () => void;
  moduleName: string;
}

const UtilitiesModal: React.FC<UtilitiesModalProps> = ({
  isOpen,
  onClose,
  onCategoryManagerClick,
  onEmptyCategoryCheckClick,
  moduleName
}) => {
  if (!isOpen) return null;

  const utilities: Utility[] = [
    {
      id: 'category-manager',
      title: 'Category Manager',
      description: `Manage ${moduleName.toLowerCase()} categories, trades, sections, and hierarchy`,
      icon: FolderTree,
      onClick: onCategoryManagerClick,
      available: true
    },
    {
      id: 'empty-category-check',
      title: 'Empty Category Check',
      description: `Find and manage categories with no ${moduleName.toLowerCase()} items`,
      icon: AlertCircle,
      onClick: onEmptyCategoryCheckClick,
      available: true
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Utilities</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4">
            {utilities.map((utility) => {
              const Icon = utility.icon;
              return (
                <button
                  key={utility.id}
                  onClick={() => {
                    if (utility.available) {
                      utility.onClick();
                      onClose();
                    }
                  }}
                  disabled={!utility.available}
                  className={`
                    relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left
                    ${utility.available 
                      ? 'border-gray-200 hover:border-orange-500 hover:bg-orange-50 cursor-pointer' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  <div className={`
                    p-3 rounded-lg
                    ${utility.available ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-400'}
                  `}>
                    <Icon className="h-6 w-6" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {utility.title}
                      </h3>
                      {!utility.available && (
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-full font-medium">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {utility.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilitiesModal;
