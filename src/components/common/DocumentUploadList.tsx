import React, { useState } from 'react';
import { Camera, Upload, X, Plus, Trash2, FileText } from 'lucide-react';

export interface DocumentItem {
  id: string;
  file?: File | null;
  url: string;
  fileName?: string;
  description: string;
}

interface DocumentUploadListProps {
  documents: DocumentItem[];
  isEditing: boolean;
  maxDocuments?: number;
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
}

const MAX_DOCUMENTS_DEFAULT = 20;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.txt,.xls,.xlsx,image/*';

const isImageFile = (doc: DocumentItem): boolean => {
  if (doc.file) return doc.file.type.startsWith('image/');
  const name = doc.fileName || doc.url;
  return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(name);
};

export const DocumentUploadList: React.FC<DocumentUploadListProps> = ({
  documents,
  isEditing,
  maxDocuments = MAX_DOCUMENTS_DEFAULT,
  onAdd,
  onRemove,
  onUpdateDescription
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atLimit = documents.length >= maxDocuments;

  const validateAndAdd = (file: File) => {
    if (file.size > MAX_DOCUMENT_SIZE) {
      setError('Document file size must be less than 10MB.');
      return;
    }
    setError(null);
    onAdd(file);
    setShowAddModal(false);
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndAdd(file);
  };

  const openCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) validateAndAdd(file);
    };
    input.click();
  };

  const editingDocument = documents.find(d => d.id === editingId) || null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Documents</h3>
        {isEditing && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={atLimit}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Document
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No documents added yet</p>
          {isEditing && <p className="text-sm">Click "Add Document" to get started</p>}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {documents.map((document) => (
            <div key={document.id} className="relative flex items-center gap-3 p-3 group hover:bg-gray-50">
              <button
                type="button"
                onClick={() => setEditingId(document.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-10 h-10 flex-shrink-0 rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {isImageFile(document) && document.url ? (
                    <img src={document.url} alt={document.fileName || 'Document'} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <span className="text-sm text-gray-900 truncate">
                  {document.fileName || 'Document'}
                </span>
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onRemove(document.id)}
                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing && documents.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">{documents.length} / {maxDocuments} documents</p>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Document</h3>
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

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openCamera}
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-md border-2 border-orange-500 bg-white text-orange-600 hover:bg-orange-50"
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">Scan</span>
              </button>
              <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 cursor-pointer">
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Upload</span>
                <input
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleUploadChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Edit/View Document Modal */}
      {editingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Document Details</h3>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="w-16 h-16 flex-shrink-0 rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                {isImageFile(editingDocument) && editingDocument.url ? (
                  <img src={editingDocument.url} alt={editingDocument.fileName || 'Document'} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-8 h-8 text-orange-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{editingDocument.fileName || 'Document'}</p>
                {editingDocument.url && (
                  <a
                    href={editingDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-800"
                  >
                    Open document
                  </a>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingDocument.description}
                onChange={(e) => onUpdateDescription(editingDocument.id, e.target.value)}
                placeholder="Describe this document..."
                rows={3}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
              />
            </div>

            <div className="flex justify-between items-center">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => { onRemove(editingDocument.id); setEditingId(null); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Document
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

export default DocumentUploadList;
