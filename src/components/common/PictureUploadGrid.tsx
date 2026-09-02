import React, { useState } from 'react';
import { Camera, Upload, X, Plus, Trash2 } from 'lucide-react';
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
  maxPictures?: number;
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
}

const MAX_PICTURES_DEFAULT = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const PictureUploadGrid: React.FC<PictureUploadGridProps> = ({
  pictures,
  isEditing,
  maxPictures = MAX_PICTURES_DEFAULT,
  onAdd,
  onRemove,
  onUpdateDescription
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const atLimit = pictures.length >= maxPictures;

  const validateAndAdd = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const processed = file.size > MAX_IMAGE_SIZE ? await compressImage(file) : file;
      if (processed.size > MAX_IMAGE_SIZE) {
        setError('Image file size must be less than 5MB, even after compression.');
        return;
      }
      onAdd(processed);
      setShowAddModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void validateAndAdd(file);
    e.target.value = '';
  };

  const openCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void validateAndAdd(file);
    };
    input.click();
  };

  const editingPicture = pictures.find(p => p.id === editingId) || null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Pictures</h3>
        {isEditing && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={atLimit}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Picture
          </button>
        )}
      </div>

      {pictures.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No pictures added yet</p>
          {isEditing && <p className="text-sm">Click "Add Picture" to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pictures.map((picture) => (
            <div key={picture.id} className="relative group">
              <button
                type="button"
                onClick={() => setEditingId(picture.id)}
                className="block w-full"
              >
                <SquareImage src={picture.url} alt={picture.description || 'Picture'} disableLightbox />
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
                onClick={() => setEditingId(null)}
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
                value={editingPicture.description}
                onChange={(e) => onUpdateDescription(editingPicture.id, e.target.value)}
                placeholder="Describe what this picture shows..."
                rows={3}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
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
                onClick={() => setEditingId(null)}
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
