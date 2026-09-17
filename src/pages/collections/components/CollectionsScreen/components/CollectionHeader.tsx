// src/pages/collections/components/CollectionsScreen/components/CollectionHeader.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, Trash2, X, MoreVertical, RefreshCw, Loader2, Check, ImagePlus, ImageOff } from 'lucide-react';
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
  onSaveChanges?: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  activeView?: 'summary' | 'products' | 'labor' | 'tools' | 'equipment';
  coverImageUrl?: string;
  canUploadCover?: boolean;
  onCoverUpload?: (file: File) => Promise<void>;
  onCoverRemove?: () => Promise<void>;
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
  onSaveChanges,
  hasUnsavedChanges,
  isSaving,
  activeView,
  coverImageUrl,
  canUploadCover = true,
  onCoverUpload,
  onCoverRemove,
}) => {
  const { currentUser } = useAuthContext();
  const [trades, setTrades] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => setImageFailed(false), [coverImageUrl]);
  const chooseCover = () => {
    setCoverError(null);
    if (!canUploadCover) return setCoverError('Save the collection first before adding an image.');
    coverInputRef.current?.click();
  };
  const uploadCover = async (file?: File) => {
    if (!file || !onCoverUpload) return;
    setIsUploadingCover(true); setCoverError(null);
    try { await onCoverUpload(file); } catch (error) { setCoverError(error instanceof Error ? error.message : 'Could not upload image'); }
    finally { setIsUploadingCover(false); if (coverInputRef.current) coverInputRef.current.value = ''; }
  };
  const removeCover = async () => {
    if (!onCoverRemove) return;
    setIsUploadingCover(true); setCoverError(null);
    try { await onCoverRemove(); } catch (error) { setCoverError(error instanceof Error ? error.message : 'Could not remove image'); }
    finally { setIsUploadingCover(false); }
  };

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

          <div className="shrink-0">
            <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
              onChange={(event) => void uploadCover(event.target.files?.[0])} />
            <div className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              {coverImageUrl && !imageFailed ? (
                <img src={coverImageUrl} alt="Collection cover" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
              ) : (
                <ImageOff aria-hidden="true" className="absolute inset-0 m-auto h-7 w-7 text-gray-400" />
              )}
              <button type="button" onClick={chooseCover} disabled={isUploadingCover}
                aria-label={coverImageUrl ? 'Change collection image' : 'Upload collection image'}
                className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 disabled:cursor-wait">
                {isUploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImagePlus className="mr-1 h-4 w-4" />{coverImageUrl ? 'Change image' : 'Upload image'}</>}
              </button>
            </div>
            {coverImageUrl && onCoverRemove && (
              <button type="button" onClick={() => void removeCover()} disabled={isUploadingCover} className="mt-1 text-xs text-gray-600 underline hover:text-red-700 disabled:opacity-50">Remove image</button>
            )}
            {coverError && <p role="alert" className="mt-1 max-w-32 text-xs text-red-700">{coverError}</p>}
          </div>

          {isEditing ? (
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-3">
                {/* Title */}
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 focus:outline-none px-2 py-1 flex-1 min-w-0 inline-block"
                  placeholder="Collection name..."
                  autoFocus
                />

                {/* Trade Dropdown */}
                <div className="w-full max-w-xs">
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
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{collectionName}</h1>
                {trade && (
                  <p className="text-sm text-gray-900 font-medium mt-1 bg-gray-100 px-2 py-1 rounded">
                    {trade}
                  </p>
                )}
              </div>

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

              {/* Save Changes Button - Only show when not on summary view */}
              {onSaveChanges && activeView !== 'summary' && (
                <button
                  onClick={() => {
                    if (hasUnsavedChanges && !isSaving) {
                      onSaveChanges();
                    }
                  }}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm
                    ${hasUnsavedChanges && !isSaving
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }
                  `}
                  title={hasUnsavedChanges ? 'Save your changes' : 'No changes to save'}
                >
                  {(() => {
                    if (isSaving) {
                      console.log('💾 [SAVE BUTTON] State: SAVING (spinner)');
                    } else if (hasUnsavedChanges) {
                      console.log('💾 [SAVE BUTTON] State: ACTIVE (green, clickable)');
                    } else {
                      console.log('💾 [SAVE BUTTON] State: DISABLED (gray)');
                    }
                    return null;
                  })()}
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved</span>
                    </>
                  )}
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
