import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName: string;
  categoryCount: number;
  productCount: number;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  categoryName,
  categoryCount,
  productCount
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isConfirmValid = confirmText === categoryName;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsDeleting(false);
      setConfirmText('');
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border-4 border-red-500">
        {/* Header */}
        <div className="bg-red-500 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-white" />
              <h2 className="text-2xl font-bold text-white">
                Delete Category
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-red-600 rounded-lg p-1 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-gray-800 text-lg">
              If you delete <span className="font-bold text-red-600">"{categoryName}"</span>, you will be deleting:
            </p>
            <ul className="mt-3 space-y-2 text-gray-700">
              {categoryCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="font-bold text-red-600 text-xl">{categoryCount}</span>
                  <span>child {categoryCount === 1 ? 'category' : 'categories'}</span>
                </li>
              )}
              {productCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="font-bold text-red-600 text-xl">{productCount}</span>
                  <span>{productCount === 1 ? 'product' : 'products'}</span>
                </li>
              )}
              {categoryCount === 0 && productCount === 0 && (
                <li className="text-gray-600">This category (no children or products)</li>
              )}
            </ul>
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">{categoryName}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter category name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 transition-all"
              autoFocus
            />
          </div>

          {/* Warning Notice */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ This action cannot be undone. All data will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors ${
              isConfirmValid && !isDeleting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isDeleting ? 'Deleting...' : 'Delete Category'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;