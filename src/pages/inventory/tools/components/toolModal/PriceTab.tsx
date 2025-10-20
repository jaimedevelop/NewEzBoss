// src/pages/inventory/tools/components/toolModal/PriceTab.tsx
import React from 'react';
import { DollarSign } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { useToolCreation } from '../../../../../contexts/ToolCreationContext';

interface PriceTabProps {
  disabled?: boolean;
}

const PriceTab: React.FC<PriceTabProps> = ({ disabled = false }) => {
  const { state, updateField } = useToolCreation();
  const { formData } = state;

  return (
    <div className="space-y-6">
      {/* Highlighted section for minimum charge */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-500 rounded-full p-2">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-blue-900">Minimum Customer Charge</h3>
        </div>
        
        <FormField 
          label="Minimum Charge Amount" 
          error={formData.errors.minimumCustomerCharge}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              $
            </span>
            <InputField
              type="number"
              step="0.01"
              min="0"
              value={formData.minimumCustomerCharge.toString()}
              onChange={(e) => !disabled && updateField('minimumCustomerCharge', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              error={!!formData.errors.minimumCustomerCharge}
              disabled={disabled}
              className="pl-8"
            />
          </div>
        </FormField>

        <p className="text-sm text-blue-700 mt-3">
          This is the minimum amount to charge customers for using this tool on a job.
        </p>
      </div>

      {/* Display current charge */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-600 mb-2">Current Minimum Charge</p>
        <p className="text-4xl font-bold text-gray-900">
          ${formData.minimumCustomerCharge.toFixed(2)}
        </p>
      </div>

    </div>
  );
};

export default PriceTab;