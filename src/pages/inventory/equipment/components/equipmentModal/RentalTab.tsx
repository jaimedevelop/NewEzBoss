// src/pages/inventory/equipment/components/equipmentModal/RentalTab.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Store, DollarSign, User, Package, Plus, Trash2, TrendingDown, TrendingUp, } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../../mainComponents/forms/HierarchicalSelect';
import { useEquipmentCreation } from '../../../../../contexts/EquipmentCreationContext';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import {
  getRentalStores,
  addRentalStore,
  type RentalStore
} from '../../../../../services/inventory/equipment/rentalStores';

interface RentalTabProps {
  disabled?: boolean;
}

const RentalTab: React.FC<RentalTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { state, addRentalEntry, removeRentalEntry, updateRentalEntry } = useEquipmentCreation();
  const { formData } = state;

  const [rentalStores, setRentalStores] = useState<RentalStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local state to track string values for inputs (allows typing decimals freely)
  const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>({});

  const isRentedEquipment = formData.equipmentType === 'rented';

  // Initialize local values when entries change
  useEffect(() => {
    const newLocalValues: Record<string, Record<string, string>> = {};
    formData.rentalEntries.forEach(entry => {
      newLocalValues[entry.id] = {
        dailyRate: entry.dailyRate === 0 ? '' : entry.dailyRate.toString(),
        weeklyRate: entry.weeklyRate === 0 ? '' : entry.weeklyRate.toString(),
        monthlyRate: entry.monthlyRate === 0 ? '' : entry.monthlyRate.toString(),
        pickupFee: entry.pickupFee === 0 ? '' : entry.pickupFee.toString(),
        deliveryFee: entry.deliveryFee === 0 ? '' : entry.deliveryFee.toString(),
        extraFees: entry.extraFees === 0 ? '' : entry.extraFees.toString(),
      };
    });
    setLocalValues(newLocalValues);
  }, [formData.rentalEntries.length]); // Only re-initialize when entries are added/removed

const handlePriceChange = (entryId: string, field: string, value: string) => {
  // Allow only numbers with up to 2 decimal places
  if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
    setLocalValues(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: value
      }
    }));
  }
};

  const handlePriceBlur = (entryId: string, field: string, value: string) => {
    // Parse and update the actual value on blur
    const numericValue = parseFloat(value) || 0;
    updateRentalEntry(entryId, field as any, numericValue);
    
    // Update local value to match parsed value
    setLocalValues(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: numericValue === 0 ? '' : numericValue.toString()
      }
    }));
  };

  // Calculate rental price comparison dynamically
  const rentalComparison = useMemo(() => {
    if (!formData.rentalEntries || formData.rentalEntries.length === 0) {
      return {
        lowestDaily: null,
        highestDaily: null,
        averageDaily: 0,
        lowestWeekly: null,
        highestWeekly: null,
        averageWeekly: 0,
        lowestMonthly: null,
        highestMonthly: null,
        averageMonthly: 0
      };
    }

    const validEntries = formData.rentalEntries.filter(e => e.storeName);
    if (validEntries.length === 0) {
      return {
        lowestDaily: null,
        highestDaily: null,
        averageDaily: 0,
        lowestWeekly: null,
        highestWeekly: null,
        averageWeekly: 0,
        lowestMonthly: null,
        highestMonthly: null,
        averageMonthly: 0
      };
    }

    // Daily rates
    const dailyRates = validEntries.filter(e => e.dailyRate > 0);
    const dailyRateValues = dailyRates.map(e => e.dailyRate);
    const lowestDailyIdx = dailyRateValues.length > 0 ? dailyRateValues.indexOf(Math.min(...dailyRateValues)) : -1;
    const highestDailyIdx = dailyRateValues.length > 0 ? dailyRateValues.indexOf(Math.max(...dailyRateValues)) : -1;

    // Weekly rates
    const weeklyRates = validEntries.filter(e => e.weeklyRate > 0);
    const weeklyRateValues = weeklyRates.map(e => e.weeklyRate);
    const lowestWeeklyIdx = weeklyRateValues.length > 0 ? weeklyRateValues.indexOf(Math.min(...weeklyRateValues)) : -1;
    const highestWeeklyIdx = weeklyRateValues.length > 0 ? weeklyRateValues.indexOf(Math.max(...weeklyRateValues)) : -1;

    // Monthly rates
    const monthlyRates = validEntries.filter(e => e.monthlyRate > 0);
    const monthlyRateValues = monthlyRates.map(e => e.monthlyRate);
    const lowestMonthlyIdx = monthlyRateValues.length > 0 ? monthlyRateValues.indexOf(Math.min(...monthlyRateValues)) : -1;
    const highestMonthlyIdx = monthlyRateValues.length > 0 ? monthlyRateValues.indexOf(Math.max(...monthlyRateValues)) : -1;

    return {
      lowestDaily: lowestDailyIdx >= 0 ? {
        store: dailyRates[lowestDailyIdx].storeName,
        rate: dailyRateValues[lowestDailyIdx]
      } : null,
      highestDaily: highestDailyIdx >= 0 ? {
        store: dailyRates[highestDailyIdx].storeName,
        rate: dailyRateValues[highestDailyIdx]
      } : null,
      averageDaily: dailyRateValues.length > 0 
        ? dailyRateValues.reduce((a, b) => a + b, 0) / dailyRateValues.length 
        : 0,
      lowestWeekly: lowestWeeklyIdx >= 0 ? {
        store: weeklyRates[lowestWeeklyIdx].storeName,
        rate: weeklyRateValues[lowestWeeklyIdx]
      } : null,
      highestWeekly: highestWeeklyIdx >= 0 ? {
        store: weeklyRates[highestWeeklyIdx].storeName,
        rate: weeklyRateValues[highestWeeklyIdx]
      } : null,
      averageWeekly: weeklyRateValues.length > 0 
        ? weeklyRateValues.reduce((a, b) => a + b, 0) / weeklyRateValues.length 
        : 0,
      lowestMonthly: lowestMonthlyIdx >= 0 ? {
        store: monthlyRates[lowestMonthlyIdx].storeName,
        rate: monthlyRateValues[lowestMonthlyIdx]
      } : null,
      highestMonthly: highestMonthlyIdx >= 0 ? {
        store: monthlyRates[highestMonthlyIdx].storeName,
        rate: monthlyRateValues[highestMonthlyIdx]
      } : null,
      averageMonthly: monthlyRateValues.length > 0 
        ? monthlyRateValues.reduce((a, b) => a + b, 0) / monthlyRateValues.length 
        : 0
    };
  }, [formData.rentalEntries]);

  // Load rental stores
  useEffect(() => {
    const loadRentalStores = async () => {
      if (!currentUser?.uid) return;
      
      setIsLoading(true);
      try {
        const result = await getRentalStores(currentUser.uid);
        if (result.success && result.data) {
          setRentalStores(result.data);
        }
      } catch (error) {
        console.error('Error loading rental stores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRentalStores();
  }, [currentUser?.uid]);

  // Handle adding new rental store
  const handleAddRentalStore = async (storeName: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addRentalStore(storeName.trim(), currentUser.uid);
    
    if (result.success) {
      // Reload stores
      const storesResult = await getRentalStores(currentUser.uid);
      if (storesResult.success && storesResult.data) {
        setRentalStores(storesResult.data);
      }
    }
    
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Rental Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Store className="h-5 w-5 text-gray-600" />
            <span>Rental Options</span>
          </h3>
          <button
            type="button"
            onClick={addRentalEntry}
            disabled={disabled || !isRentedEquipment}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium ${
              disabled || !isRentedEquipment
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Add Rental</span>
          </button>
        </div>

        {formData.rentalEntries.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No rental options added</p>
            <p className="text-sm text-gray-500 mt-1">
              Click "Add Rental" to add rental store and pricing information
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.rentalEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="bg-white border border-gray-200 rounded-lg p-4 space-y-4"
              >
                {/* Header with delete button */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Rental Option {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeRentalEntry(entry.id)}
                    disabled={disabled || !isRentedEquipment}
                    className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    title="Remove rental option"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Store Name */}
                <FormField 
                  label="Store Name" 
                  required
                  error={formData.errors[`rentalEntry_${index}_storeName`]}
                >
                  <HierarchicalSelect
                    value={entry.storeName}
                    onChange={(value) => updateRentalEntry(entry.id, 'storeName', value)}
                    options={rentalStores.map(store => ({
                      value: store.name,
                      label: store.name,
                      id: store.id
                    }))}
                    placeholder={isLoading ? "Loading..." : "Select or add rental store"}
                    onAddNew={!disabled && isRentedEquipment ? handleAddRentalStore : undefined}
                    disabled={disabled || !isRentedEquipment || isLoading}
                    required
                  />
                </FormField>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField label="Daily Rate">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        $
                      </span>
                      <InputField
                        type="number"
                        step="0.01"
                        min="0"
                        value={localValues[entry.id]?.dailyRate || ''}
                        onChange={(e) => handlePriceChange(entry.id, 'dailyRate', e.target.value)}
                        onBlur={(e) => handlePriceBlur(entry.id, 'dailyRate', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        disabled={disabled || !isRentedEquipment}
                      />
                    </div>
                  </FormField>

                  <FormField label="Weekly Rate">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        $
                      </span>
                      <InputField
                        type="number"
                        step="0.01"
                        min="0"
                        value={localValues[entry.id]?.weeklyRate || ''}
                        onChange={(e) => handlePriceChange(entry.id, 'weeklyRate', e.target.value)}
                        onBlur={(e) => handlePriceBlur(entry.id, 'weeklyRate', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        disabled={disabled || !isRentedEquipment}
                      />
                    </div>
                  </FormField>

                  <FormField label="Monthly Rate">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        $
                      </span>
                      <InputField
                        type="number"
                        step="0.01"
                        min="0"
                        value={localValues[entry.id]?.monthlyRate || ''}
                        onChange={(e) => handlePriceChange(entry.id, 'monthlyRate', e.target.value)}
                        onBlur={(e) => handlePriceBlur(entry.id, 'monthlyRate', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        disabled={disabled || !isRentedEquipment}
                      />
                    </div>
                  </FormField>

                  <FormField label="Pickup Fee">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        $
                      </span>
                      <InputField
                        type="number"
                        step="0.01"
                        min="0"
                        value={localValues[entry.id]?.pickupFee || ''}
                        onChange={(e) => handlePriceChange(entry.id, 'pickupFee', e.target.value)}
                        onBlur={(e) => handlePriceBlur(entry.id, 'pickupFee', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        disabled={disabled || !isRentedEquipment}
                      />
                    </div>
                  </FormField>

                  <FormField label="Delivery Fee">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        $
                      </span>
                      <InputField
                        type="number"
                        step="0.01"
                        min="0"
                        value={localValues[entry.id]?.deliveryFee || ''}
                        onChange={(e) => handlePriceChange(entry.id, 'deliveryFee', e.target.value)}
                        onBlur={(e) => handlePriceBlur(entry.id, 'deliveryFee', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        disabled={disabled || !isRentedEquipment}
                      />
                    </div>
                  </FormField>

                  <FormField label="Extra Fees">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        $
                      </span>
                      <InputField
                        type="number"
                        step="0.01"
                        min="0"
                        value={localValues[entry.id]?.extraFees || ''}
                        onChange={(e) => handlePriceChange(entry.id, 'extraFees', e.target.value)}
                        onBlur={(e) => handlePriceBlur(entry.id, 'extraFees', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        disabled={disabled || !isRentedEquipment}
                      />
                    </div>
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

{/* Rental Price Comparison Summary */}
      {formData.rentalEntries.length > 1 && rentalComparison.lowestDaily && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Rental Price Comparison</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate Period
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingDown className="w-3 h-3" />
                      <span>Lowest</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Highest</span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Daily Rates Row */}
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    Daily
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                    <div className="font-medium text-green-600">
                      ${rentalComparison.lowestDaily.rate.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {rentalComparison.lowestDaily.store}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                    <div className="font-medium text-red-600">
                      ${rentalComparison.highestDaily.rate.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {rentalComparison.highestDaily.store}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                    <div className="font-medium text-blue-600">
                      ${rentalComparison.averageDaily.toFixed(2)}
                    </div>
                  </td>
                </tr>

                {/* Weekly Rates Row */}
                {rentalComparison.lowestWeekly && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      Weekly
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <div className="font-medium text-green-600">
                        ${rentalComparison.lowestWeekly.rate.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {rentalComparison.lowestWeekly.store}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <div className="font-medium text-red-600">
                        ${rentalComparison.highestWeekly.rate.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {rentalComparison.highestWeekly.store}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <div className="font-medium text-blue-600">
                        ${rentalComparison.averageWeekly.toFixed(2)}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Monthly Rates Row */}
                {rentalComparison.lowestMonthly && (
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      Monthly
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <div className="font-medium text-green-600">
                        ${rentalComparison.lowestMonthly.rate.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {rentalComparison.lowestMonthly.store}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <div className="font-medium text-red-600">
                        ${rentalComparison.highestMonthly.rate.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {rentalComparison.highestMonthly.store}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                      <div className="font-medium text-blue-600">
                        ${rentalComparison.averageMonthly.toFixed(2)}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Comparison across {formData.rentalEntries.length} rental stores
          </p>
        </div>
      )}

      {/* Future Features - Greyed Out */}
      <div className="space-y-4 opacity-50 pointer-events-none">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <User className="h-5 w-5 text-gray-600" />
          <span>Pickup/Delivery Details</span>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Assigned Pickup/Delivery Person">
            <InputField
              value=""
              placeholder="Select employee"
              disabled={true}
            />
          </FormField>

          <FormField label="Pickup/Delivery Status">
            <select
              disabled={true}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed"
            >
              <option value="">Select status</option>
              <option value="pending">Pending</option>
              <option value="picked-up">Picked Up</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>
          </FormField>
        </div>

        <p className="text-sm text-gray-500 italic">
          Pickup/delivery assignment features will be available when the employee management system is implemented.
        </p>
      </div>
    </div>
  );
};

export default RentalTab;