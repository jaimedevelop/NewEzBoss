// src/pages/collections/components/CollectionsScreen/components/CollectionHeader.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, Trash2, X, MoreVertical, RefreshCw, Loader2 } from 'lucide-react';
import { getProductTrades } from '../../../../../services/categories/trades';
import { useAuthContext } from '../../../../../contexts/AuthContext';

interface CollectionHeaderProps {
  collectionName: string;
  description?: string;
  trade?: string;
  isEditing: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTradeChange: (trade: string) => void;
  onOptionsClick: () => void;
  onRefreshItems?: () => void;
  isRefreshing?: boolean;
}

const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  collectionName,
  description,
  trade,
  isEditing,
  onBack,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onNameChange,
  onDescriptionChange,
  onTradeChange,
  onOptionsClick,
  onRefreshItems,
  isRefreshing,
}) => {
  const { currentUser } = useAuthContext();
  const [trades, setTrades] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  // Load trades when editing mode is enabled
  useEffect(() => {
    if (!isEditing || !currentUser?.uid) return;
    
    const loadTrades = async () => {
      setIsLoadingTrades(true);
      try {
        const result = await getProductTrades(currentUser.uid);
        if (result.success && result.data) {
          setTrades(result.data);
        }
      } catch (err) {
        console.error('Error loading trades:', err);
      } finally {
        setIsLoadingTrades(false);
      }
    };

    loadTrades();
  }, [isEditing, currentUser]);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-start justify-between">
        {/* Left side - Back button and content */}
        <div className="flex items-start gap-4 flex-1">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {isEditing ? (
            <div className="flex-1 max-w-4xl">
              {/* Title */}
              <input
                type="text"
                value={collectionName}
                onChange={(e) => onNameChange(e.target.value)}
                className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 focus:outline-none px-2 py-1 mb-3 inline-block min-w-[300px]"
                placeholder="Collection name..."
                autoFocus
              />
              
              {/* Description and Trade side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-2">
                    Description
                  </label>
                  <textarea
                    value={description || ''}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    className="w-full text-sm text-gray-600 border-b-2 border-orange-300 focus:outline-none focus:border-orange-500 px-2 py-1 resize-none"
                    placeholder="Add a description... (optional)"
                    rows={1}
                  />
                </div>

                {/* Trade Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-2">
                    Trade
                  </label>
                  {isLoadingTrades ? (
                    <div className="flex items-center gap-2 px-2 py-1 border-b-2 border-gray-300">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Loading...</span>
                    </div>
                  ) : (
                    <select
                      value={trade || ''}
                      onChange={(e) => onTradeChange(e.target.value)}
                      className="w-full text-sm text-gray-900 border-b-2 border-orange-300 focus:outline-none focus:border-orange-500 px-2 py-1 bg-white"
                    >
                      <option value="">Select a trade...</option>
                      {trades.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{collectionName}</h1>
              
              {/* Description and Trade Display */}
              <div className="grid grid-cols-2 gap-4">
                {/* Description */}
                <div>
                  {description && (
                    <>
                      <span className="text-xs font-medium text-gray-500">Description:</span>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                        {description}
                      </p>
                    </>
                  )}
                </div>

                {/* Trade */}
                <div>
                  {trade && (
                    <>
                      <span className="text-xs font-medium text-gray-500">Trade:</span>
                      <p className="text-sm text-gray-900 font-medium mt-1">
                        {trade}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2 ml-4">
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
              {/* Refresh Items Button */}
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