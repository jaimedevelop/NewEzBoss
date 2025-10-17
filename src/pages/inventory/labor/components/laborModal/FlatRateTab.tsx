// src/pages/labor/components/creationModal/FlatRateTab.tsx
import React from 'react';
import { Plus, Trash2, DollarSign, Clock } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { useLaborCreation } from '../../../../../contexts/LaborCreationContext';

interface FlatRateTabProps {
  disabled?: boolean;
}

const FlatRateTab: React.FC<FlatRateTabProps> = ({ disabled = false }) => {
  const { 
    state, 
    updateFlatRateEntry, 
    addFlatRateEntry, 
    removeFlatRateEntry,
    updateFormData
  } = useLaborCreation();
  
  const { formData } = state;

  // Calculate statistics from flat rates
  const flatRateStats = React.useMemo(() => {
    if (!formData.flatRates || formData.flatRates.length === 0) {
      return { lowest: null, highest: null, average: 0 };
    }

    const validRates = formData.flatRates.filter(r => r.name && r.rate);
    if (validRates.length === 0) {
      return { lowest: null, highest: null, average: 0 };
    }

    const numericRates = validRates.map(r => parseFloat(r.rate));
    const lowestIdx = numericRates.indexOf(Math.min(...numericRates));
    const highestIdx = numericRates.indexOf(Math.max(...numericRates));
    
    return {
      lowest: validRates[lowestIdx] ? {
        name: validRates[lowestIdx].name,
        rate: numericRates[lowestIdx]
      } : null,
      highest: validRates[highestIdx] ? {
        name: validRates[highestIdx].name,
        rate: numericRates[highestIdx]
      } : null,
      average: numericRates.reduce((a, b) => a + b, 0) / numericRates.length
    };
  }, [formData.flatRates]);

  const handleRemoveFlatRate = (id: string) => {
    if (disabled) return;
    removeFlatRateEntry(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Flat Rate Pricing</h3>
        {!disabled && (
          <button
            type="button"
            onClick={addFlatRateEntry}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Flat Rate
          </button>
        )}
      </div>

      {/* Estimated Hours */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <FormField label="Estimated Hours" required>
          <div className="relative">
            <InputField
              type="number"
              min="0"
              step="0.5"
              value={formData.estimatedHours || ''}
              onChange={(e) => !disabled && updateFormData('estimatedHours', e.target.value)}
              placeholder="0.0"
              disabled={disabled}
              required
            />
            <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Average time to complete this labor task
          </p>
        </FormField>
      </div>

      {/* Flat Rate Entries */}
      <div className="space-y-3">
        {formData.flatRates && formData.flatRates.map((entry) => (
          <div key={entry.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Rate Name">
                <InputField
                  type="text"
                  value={entry.name}
                  onChange={(e) => !disabled && updateFlatRateEntry(entry.id, 'name', e.target.value)}
                  placeholder="e.g., Standard, Premium, Emergency"
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Flat Rate ($)">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.rate}
                    onChange={(e) => !disabled && updateFlatRateEntry(entry.id, 'rate', e.target.value)}
                    placeholder="0.00"
                    disabled={disabled}
                    className="w-full px-3 py-2 pr-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <DollarSign className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </FormField>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveFlatRate(entry.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {(!formData.flatRates || formData.flatRates.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <div className="text-sm">No flat rates added yet</div>
            {!disabled && (
              <div className="text-xs mt-1">Click "Add Flat Rate" to add pricing options</div>
            )}
          </div>
        )}
      </div>

      {/* Rate Comparison Summary */}
      {formData.flatRates && formData.flatRates.length > 1 && flatRateStats.lowest && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Rate Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
              <div>
                <span className="text-gray-500">Lowest:</span>
                <div className="font-medium text-green-600">
                  ${flatRateStats.lowest.rate.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  {flatRateStats.lowest.name}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
              <div>
                <span className="text-gray-500">Highest:</span>
                <div className="font-medium text-red-600">
                  ${flatRateStats.highest.rate.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  {flatRateStats.highest.name}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
              <div>
                <span className="text-gray-500">Average:</span>
                <div className="font-medium text-blue-600">
                  ${flatRateStats.average.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  Across {formData.flatRates.filter(r => r.name && r.rate).length} rates
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlatRateTab;