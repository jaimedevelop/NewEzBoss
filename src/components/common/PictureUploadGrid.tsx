import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X, Plus, Trash2, GripVertical } from 'lucide-react';
import SquareImage from './SquareImage';
import { compressImage } from '../../services/estimates/estimates.files';

export interface PictureItem {
  id: string;
  file: File | null;
  url: string;
  description: string;
}

interface PictureUploadGridProps {
  pictures: PictureItem[];
  isEditing: boolean;
  compact?: boolean;
  maxPictures?: number;
  showTitle?: boolean;
  showEmptyState?: boolean;
  addButtonLabel?: string;
  showAddButton?: boolean;
  /** Shows a brief confirmation badge on each image added during this session. */
  showUploadSuccess?: boolean;
  onAdd: (file: File) => void;
  /** Called with a batch when the file picker has more than one image selected. */
  onAddMany?: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder?: (activeId: string, overId: string, edge: 'before' | 'after') => void;
  onUpdateDescription: (id: string, description: string) => void;
}

const MAX_PICTURES_DEFAULT = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const PictureUploadGrid: React.FC<PictureUploadGridProps> = ({
  pictures,
  isEditing,
  compact = false,
  maxPictures = MAX_PICTURES_DEFAULT,
  showTitle = true,
  showEmptyState = true,
  addButtonLabel = 'Add Picture',
  showAddButton = true,
  showUploadSuccess = false,
  onAdd,
  onAddMany,
  onRemove,
  onUpdateDescription,
  onReorder
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const lastSubmittedDescription = useRef('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedPictureId, setDraggedPictureId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; edge: 'before' | 'after' } | null>(null);
  const [recentlyUploadedIds, setRecentlyUploadedIds] = useState<Set<string>>(() => new Set());
  // Track the File rather than its temporary/server id, since an optimistic
  // preview is replaced with its persisted record after the upload finishes.
  const acknowledgedUploadFiles = useRef<WeakSet<File>>(new WeakSet());
  const successTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const atLimit = pictures.length >= maxPictures;

  useEffect(() => {
    if (!showUploadSuccess) return;

    // New selections retain their File while saved estimate photos have no
    // local file. This also works if the grid first mounts after the picker
    // resolves, which can happen when switching an estimate into edit mode.
    const addedIds = pictures
      .filter(picture => picture.file instanceof File && !acknowledgedUploadFiles.current.has(picture.file))
      .map(picture => {
        acknowledgedUploadFiles.current.add(picture.file as File);
        return picture.id;
      });
    if (addedIds.length === 0) return;

    setRecentlyUploadedIds(previous => new Set([...previous, ...addedIds]));
    const timer = setTimeout(() => {
      setRecentlyUploadedIds(previous => {
        const remaining = new Set(previous);
        addedIds.forEach(id => remaining.delete(id));
        return remaining;
      });
      successTimers.current.delete(timer);
    }, 2000);
    successTimers.current.add(timer);
  }, [pictures, showUploadSuccess]);

  useEffect(() => () => {
    successTimers.current.forEach(timer => clearTimeout(timer));
  }, []);

  const validateAndAdd = async (selectedFiles: File[]) => {
    const remainingSlots = maxPictures - pictures.length;
    if (remainingSlots <= 0) {
      setError(`This estimate can have up to ${maxPictures} photos.`);
      return;
    }
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file.');
      return;
    }

    const filesToAdd = imageFiles.slice(0, remainingSlots);
    const skippedForLimit = Math.max(0, imageFiles.length - remainingSlots);
    setIsProcessing(true);
    setError(null);
    try {
      const processedFiles: File[] = [];
      for (const file of filesToAdd) {
        const processed = file.size > MAX_IMAGE_SIZE ? await compressImage(file) : file;
        if (processed.size > MAX_IMAGE_SIZE) {
          setError(`\"${file.name}\" must be less than 5MB, even after compression.`);
          continue;
        }
        processedFiles.push(processed);
      }
      if (processedFiles.length > 0) {
        if (onAddMany) onAddMany(processedFiles);
        else processedFiles.forEach(onAdd);
      }
      if (skippedForLimit > 0) {
        setError(`Only ${remainingSlots} more ${remainingSlots === 1 ? 'photo can' : 'photos can'} be added (limit: ${maxPictures}).`);
      } else {
        setShowAddModal(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) void validateAndAdd(files);
    e.target.value = '';
  };

  const openCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void validateAndAdd([file]);
    };
    input.click();
  };

  const editingPicture = pictures.find(p => p.id === editingId) || null;

  // Keep the text area independent of the persisted picture while someone is
  // typing. Some callers save a complete, versioned record, which is too
  // expensive (and disruptive) to do once per character.
  useEffect(() => {
    const description = editingPicture?.description ?? '';
    setDescriptionDraft(description);
    lastSubmittedDescription.current = description;
  }, [editingId]);

  const commitDescription = () => {
    if (!editingPicture || descriptionDraft === lastSubmittedDescription.current) return;
    lastSubmittedDescription.current = descriptionDraft;
    onUpdateDescription(editingPicture.id, descriptionDraft);
  };

  const closePictureDetails = () => {
    commitDescription();
    setEditingId(null);
  };

  return (
    <div>
      <div className={`flex items-center ${showTitle ? 'justify-between' : 'justify-end'} mb-4`}>
        {showTitle && <h3 className="text-lg font-medium text-gray-900">Pictures</h3>}
        {isEditing && showAddButton && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={atLimit}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            {addButtonLabel}
          </button>
        )}
      </div>

      {pictures.length === 0 && showEmptyState ? (
        <div className={`text-center text-sm text-gray-500 ${compact ? 'py-3' : 'py-8'}`}>
          <Camera className={`mx-auto mb-2 text-gray-400 ${compact ? 'w-6 h-6' : 'w-12 h-12'}`} />
          <p>No pictures added yet</p>
          {isEditing && <p className="text-sm">Click "Add Picture" to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pictures.map((picture) => (
            <div
              key={picture.id}
              draggable={isEditing && Boolean(onReorder)}
              onDragStart={(event) => {
                setDraggedPictureId(picture.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', picture.id);
              }}
              onDragEnd={() => {
                setDraggedPictureId(null);
                setDropTarget(null);
              }}
              onDragOver={(event) => {
                if (isEditing && onReorder && picture.id !== draggedPictureId) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const edge = event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after';
                  setDropTarget({ id: picture.id, edge });
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const activeId = event.dataTransfer.getData('text/plain');
                if (activeId && activeId !== picture.id) {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const edge = event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after';
                  onReorder?.(activeId, picture.id, edge);
                }
                setDraggedPictureId(null);
                setDropTarget(null);
              }}
              className={`relative group ${isEditing && onReorder ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedPictureId === picture.id ? 'opacity-40' : ''}`}
            >
              {dropTarget?.id === picture.id && draggedPictureId !== picture.id && (
                <span className={`pointer-events-none absolute ${dropTarget.edge === 'before' ? '-left-2' : '-right-2'} top-0 bottom-0 z-20 w-1 rounded-full bg-orange-500 shadow-[0_0_0_2px_white]`} aria-hidden="true" />
              )}
              {isEditing && onReorder && (
                <span className="absolute left-1 top-1 z-10 rounded bg-black/60 p-1 text-white" aria-label="Drag to reorder picture">
                  <GripVertical className="h-4 w-4" />
                </span>
              )}
              <button
                type="button"
                onClick={() => setEditingId(picture.id)}
                className="block w-full"
              >
                <SquareImage
                  src={picture.url}
                  alt={picture.description || 'Picture'}
                  disableLightbox
                  successMessage={recentlyUploadedIds.has(picture.id) ? 'Photo successfully uploaded' : undefined}
                />
              </button>
              {picture.description && (
                <p className="mt-1 text-xs text-gray-500 truncate" title={picture.description}>
                  {picture.description}
                </p>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onRemove(picture.id)}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing && pictures.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">{pictures.length} / {maxPictures} pictures</p>
      )}

      {/* Add Picture Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Picture</h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setError(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            {isProcessing && (
              <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-700">
                Processing image...
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openCamera}
                disabled={isProcessing}
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-md border-2 border-orange-500 bg-white text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">Camera</span>
              </button>
              <label className={`flex flex-col items-center justify-center gap-2 py-6 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadChange}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Edit/View Picture Modal */}
      {editingPicture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Picture Details</h3>
              <button
                type="button"
                onClick={closePictureDetails}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <SquareImage src={editingPicture.url} alt={editingPicture.description || 'Preview'} disableLightbox hideHoverHint />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={descriptionDraft}
                onChange={isEditing ? (e) => setDescriptionDraft(e.target.value) : undefined}
                onBlur={isEditing ? commitDescription : undefined}
                placeholder="Describe what this picture shows..."
                rows={3}
                readOnly={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 read-only:bg-gray-50"
              />
            </div>

            <div className="flex justify-between items-center">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => { onRemove(editingPicture.id); setEditingId(null); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Picture
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={closePictureDetails}
                className="px-4 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PictureUploadGrid;
