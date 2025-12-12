// src/pages/collections/components/CollectionsScreen/components/CollectionHeader.tsx
import React from 'react';
import { ArrowLeft, Edit2, Save, Trash2, X, MoreVertical, RefreshCw } from 'lucide-react';

interface CollectionHeaderProps {
  collectionName: string;
  trade?: string;
  isEditing: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onNameChange: (name: string) => void;
  onOptionsClick: () => void;
  onRefreshItems?: () => void;  // ✅ NEW
  isRefreshing?: boolean;        // ✅ NEW
}

const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  collectionName,
  trade,
  isEditing,
  onBack,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onNameChange,
  onOptionsClick,
  onRefreshItems,    // ✅ NEW
  isRefreshing,      // ✅ NEW
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Back button and title */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {isEditing ? (
            <input
              type="text"
              value={collectionName}
              onChange={(e) => onNameChange(e.target.value)}
              className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 focus:outline-none px-2 py-1"
              placeholder="Collection name..."
              autoFocus
            />
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{collectionName}</h1>
              {trade && (
                <p className="text-sm text-gray-500 mt-0.5">{trade}</p>
              )}
            </div>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={onSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </>
          ) : (
            <>
              {/* ✅ NEW: Refresh Items Button */}
              {onRefreshItems && (
                <button
                  onClick={onRefreshItems}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh Items"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">
                    {isRefreshing ? 'Refreshing...' : 'Refresh Items'}
                  </span>
                </button>
              )}
              
              <button
                onClick={onEdit}
                className="p-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors"
                title="Edit Collection"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors"
                  title="Delete Collection"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onOptionsClick}
                className="p-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors"
                title="Collection Options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionHeader;