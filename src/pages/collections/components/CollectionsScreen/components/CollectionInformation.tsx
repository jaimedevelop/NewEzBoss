// src/pages/collections/components/CollectionsScreen/components/CollectionInformation.tsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CategorySelection {
  trade?: string;
  sections?: string[];
  categories?: string[];
  subcategories?: string[];
  types?: string[];
  description?: string;
}

interface CollectionInformationProps {
  categorySelection: CategorySelection;
  description: string;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onDescriptionChange: (description: string) => void;
}

const CollectionInformation: React.FC<CollectionInformationProps> = ({
  categorySelection,
  description,
  isExpanded,
  isEditing,
  onToggleExpand,
  onDescriptionChange,
}) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <button
        onClick={onToggleExpand}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <h2 className="text-lg font-semibold text-gray-900">Collection Information</h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            ) : (
              <p className="text-gray-600">{description || 'No description'}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Sections:</span>
              <p className="text-gray-600">{categorySelection.sections?.length || 0}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Categories:</span>
              <p className="text-gray-600">{categorySelection.categories?.length || 0}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Subcategories:</span>
              <p className="text-gray-600">{categorySelection.subcategories?.length || 0}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Types:</span>
              <p className="text-gray-600">{categorySelection.types?.length || 0}</p>
            </div>
          </div>

          {categorySelection.sections && categorySelection.sections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categorySelection.sections.map((section: string) => (
                <span key={section} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {section}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionInformation;