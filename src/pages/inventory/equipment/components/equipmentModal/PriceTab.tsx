// src/pages/inventory/equipment/components/equipmentModal/PriceTab.tsx
import React from 'react';
import { DollarSign, CreditCard, Calendar, TrendingUp } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { useEquipmentCreation } from '../../../../../contexts/EquipmentCreationContext';

interface PriceTabProps {
  disabled?: boolean;
}

const PriceTab: React.FC<PriceTabProps> = ({ disabled = false }) => {
  const { state, updateField } = useEquipmentCreation();
  const { formData } = state;

  const isOwnedEquipment = formData.equipmentType === 'owned';
  const hasActiveLoan = !formData.isPaidOff;

  return (
    <div className="space-y-6">
      {/* Minimum Customer Charge - Always visible */}
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
          This is the minimum amount to charge customers for using this equipment on a job.
        </p>
      </div>

      {/* Display current charge */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-600 mb-2">Current Minimum Charge</p>
        <p className="text-4xl font-bold text-gray-900">
          ${formData.minimumCustomerCharge.toFixed(2)}
        </p>
      </div>

      {/* Loan Information - Only for Owned Equipment */}
      <div className={`space-y-4 ${!isOwnedEquipment ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-gray-600" />
            <span>Loan Information</span>
          </h3>
          {!isOwnedEquipment && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
              Owned Equipment Only
            </span>
          )}
        </div>

        {/* Paid Off Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPaidOff}
              onChange={(e) => !disabled && isOwnedEquipment && updateField('isPaidOff', e.target.checked)}
              disabled={disabled || !isOwnedEquipment}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Equipment is paid off</span>
              <p className="text-xs text-gray-500">Check if there's no active loan on this equipment</p>
            </div>
          </label>
        </div>

        {/* Loan Details - Only show if not paid off */}
        {!formData.isPaidOff && (
          <div className="space-y-4 border-l-4 border-orange-400 pl-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Active Loan:</strong> Fill in the loan details below for tracking purposes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                label="Loan Amount" 
                required={!formData.isPaidOff && isOwnedEquipment}
                error={formData.errors.loanAmount}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <InputField
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.loanAmount.toString()}
                    onChange={(e) => !disabled && isOwnedEquipment && updateField('loanAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-8"
                    disabled={disabled || !isOwnedEquipment || formData.isPaidOff}
                    required={!formData.isPaidOff && isOwnedEquipment}
                    error={!!formData.errors.loanAmount}
                  />
                </div>
              </FormField>

              <FormField 
                label="Monthly Payment" 
                required={!formData.isPaidOff && isOwnedEquipment}
                error={formData.errors.monthlyPayment}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <InputField
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyPayment.toString()}
                    onChange={(e) => !disabled && isOwnedEquipment && updateField('monthlyPayment', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-8"
                    disabled={disabled || !isOwnedEquipment || formData.isPaidOff}
                    required={!formData.isPaidOff && isOwnedEquipment}
                    error={!!formData.errors.monthlyPayment}
                  />
                </div>
              </FormField>

              <FormField 
                label="Loan Start Date" 
                required={!formData.isPaidOff && isOwnedEquipment}
                error={formData.errors.loanStartDate}
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <InputField
                    type="date"
                    value={formData.loanStartDate}
                    onChange={(e) => !disabled && isOwnedEquipment && updateField('loanStartDate', e.target.value)}
                    className="pl-10"
                    disabled={disabled || !isOwnedEquipment || formData.isPaidOff}
                    required={!formData.isPaidOff && isOwnedEquipment}
                    error={!!formData.errors.loanStartDate}
                  />
                </div>
              </FormField>

              <FormField 
                label="Loan Payoff Date" 
                required={!formData.isPaidOff && isOwnedEquipment}
                error={formData.errors.loanPayoffDate}
              >
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <InputField
                    type="date"
                    value={formData.loanPayoffDate}
                    onChange={(e) => !disabled && isOwnedEquipment && updateField('loanPayoffDate', e.target.value)}
                    className="pl-10"
                    disabled={disabled || !isOwnedEquipment || formData.isPaidOff}
                    required={!formData.isPaidOff && isOwnedEquipment}
                    error={!!formData.errors.loanPayoffDate}
                  />
                </div>
              </FormField>

              <FormField 
                label="Remaining Balance" 
                error={formData.errors.remainingBalance}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <InputField
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.remainingBalance.toString()}
                    onChange={(e) => !disabled && isOwnedEquipment && updateField('remainingBalance', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-8"
                    disabled={disabled || !isOwnedEquipment || formData.isPaidOff}
                    error={!!formData.errors.remainingBalance}
                  />
                </div>
              </FormField>
            </div>

            {/* Loan Summary */}
            {formData.loanAmount > 0 && formData.monthlyPayment > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Loan Summary</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Loan</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${formData.loanAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Monthly Payment</p>
                    <p className="text-lg font-bold text-blue-600">
                      ${formData.monthlyPayment.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Remaining</p>
                    <p className="text-lg font-bold text-orange-600">
                      ${formData.remainingBalance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Paid Off</p>
                    <p className="text-lg font-bold text-green-600">
                      ${(formData.loanAmount - formData.remainingBalance).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceTab;