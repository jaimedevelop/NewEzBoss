import React, { useState } from 'react';
import { X, AlertCircle, Save, Percent } from 'lucide-react';

interface TaxConfigModalProps {
  currentTaxRate: number; // Decimal format (0.07 = 7%)
  estimateId: string;
  onClose: () => void;
  onSave: (newTaxRate: number) => void;
}

const TaxConfigModal: React.FC<TaxConfigModalProps> = ({
  currentTaxRate,
  estimateId,
  onClose,
  onSave,
}) => {
  // Convert decimal to percentage for display
  const [taxPercentage, setTaxPercentage] = useState((currentTaxRate * 100).toFixed(2));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    
    // Validate input
    const percentage = parseFloat(taxPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      setError('Please enter a valid tax rate between 0 and 100');
      return;
    }

    setIsSaving(true);

    try {
      // Convert percentage to decimal
      const taxRateDecimal = percentage / 100;
      
      // Call onSave callback with new tax rate
      // Parent component will handle Firebase update
      onSave(taxRateDecimal);
      onClose();
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error updating tax rate:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Tax Rate
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="7.00"
              />
              <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                <Percent className="w-4 h-4" />
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the tax rate as a percentage (e.g., 7 for 7%)
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-blue-700 mb-1">Preview:</p>
            <p className="text-sm text-blue-600">
              A $100.00 subtotal will become{' '}
              <span className="font-semibold text-blue-900">
                ${(100 * (1 + parseFloat(taxPercentage || '0') / 100)).toFixed(2)}
              </span>
              {' '}with tax
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxConfigModal