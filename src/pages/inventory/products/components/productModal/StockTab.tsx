import React, { useState, useEffect, useRef } from 'react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../../mainComponents/forms/SelectField';
import HierarchicalSelect from '../../../../../mainComponents/forms/HierarchicalSelect';
import { getLocations, addLocation } from '../../../../../services/inventory/products/locations';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../../contexts/ProductCreationContext';

interface StockTabProps {
  disabled?: boolean;
}

const StockTab: React.FC<StockTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    updateField
  } = useProductCreation();
  
  const { formData } = state;
  const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const locationsLoaded = useRef(false);

  const unitOptions = [
    'Each',
    'Foot',
    'Linear Foot',
    'Square Foot',
    'Cubic Foot',
    'Gallon',
    'Pound',
    'Box',
    'Case',
    'Roll',
    'Sheet',
    'Bag',
    'Bundle'
  ];

  // Load locations only once
  useEffect(() => {
    if (!currentUser?.uid || locationsLoaded.current) return;
    
    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const result = await getLocations(currentUser.uid!);
        if (result.success && result.data) {
          const options = result.data.map(location => ({
            value: location.name,
            label: location.name
          }));
          setLocationOptions(options);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      } finally {
        setIsLoadingLocations(false);
        locationsLoaded.current = true;
      }
    };

    loadLocations();
  }, [currentUser?.uid]);

  const handleAddNewLocation = async (locationName: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await addLocation(locationName, currentUser.uid);
      
      if (result.success) {
        const newOption = { value: locationName, label: locationName };
        setLocationOptions(prev => [...prev, newOption].sort((a, b) => a.label.localeCompare(b.label)));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to add location' };
      }
    } catch (error) {
      console.error('Error adding new location:', error);
      return { success: false, error: 'Failed to add location' };
    }
  };

  // Helper function to handle numeric input changes
  const handleNumericChange = (fieldName: string, value: string) => {
    if (disabled) return;
    
    // Allow empty string
    if (value === '') {
      updateField(fieldName, '');
      return;
    }
    
    // Parse as integer, but don't default to 0
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      updateField(fieldName, numValue);
    }
  };

  // Helper to get display value (empty string if undefined/null)
  const getDisplayValue = (value: any): string => {
    if (value === undefined || value === null || value === '') return '';
    return String(value);
  };

  // Helper to get numeric value for calculations (default to 0)
  const getNumericValue = (value: any): number => {
    if (value === undefined || value === null || value === '') return 0;
    const num = typeof value === 'number' ? value : parseInt(value);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Unit" required error={formData.errors.unit}>
          <SelectField
            value={formData.unit}
            onChange={(e) => !disabled && updateField('unit', e.target.value)}
            options={unitOptions.map(option => ({ value: option, label: option }))}
            required
            disabled={disabled}
          />
        </FormField>

        <FormField label="Storage Location" error={formData.errors.location}>
          {isLoadingLocations ? (
            <InputField
              value="Loading locations..."
              disabled
              placeholder="Loading..."
            />
          ) : (
            <HierarchicalSelect
              value={formData.location}
              onChange={(value) => !disabled && updateField('location', value)}
              options={locationOptions}
              placeholder="Select or add storage location"
              onAddNew={!disabled ? handleAddNewLocation : undefined}
              disabled={disabled}
            />
          )}
        </FormField>

        <FormField label="On-Hand Quantity" error={formData.errors.onHand}>
          <InputField
            type="number"
            min="0"
            value={getDisplayValue(formData.onHand)}
            onChange={(e) => handleNumericChange('onHand', e.target.value)}
            placeholder="Enter quantity"
            error={!!formData.errors.onHand}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Assigned Quantity" error={formData.errors.assigned}>
          <InputField
            type="number"
            min="0"
            value={getDisplayValue(formData.assigned)}
            onChange={(e) => handleNumericChange('assigned', e.target.value)}
            placeholder="Enter quantity"
            title="Quantity currently assigned to projects"
            error={!!formData.errors.assigned}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Available Quantity">
          <InputField
            type="number"
            value={formData.available}
            placeholder="Auto-calculated"
            disabled
            title="This is calculated automatically (On-Hand - Assigned)"
          />
        </FormField>

        <FormField label="Minimum Stock" error={formData.errors.minStock}>
          <InputField
            type="number"
            min="0"
            value={getDisplayValue(formData.minStock)}
            onChange={(e) => handleNumericChange('minStock', e.target.value)}
            placeholder="Enter minimum"
            error={!!formData.errors.minStock}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Maximum Stock" error={formData.errors.maxStock}>
          <InputField
            type="number"
            min="0"
            value={getDisplayValue(formData.maxStock)}
            onChange={(e) => handleNumericChange('maxStock', e.target.value)}
            placeholder="Enter maximum"
            error={!!formData.errors.maxStock}
            disabled={disabled}
          />
        </FormField>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Stock Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">On Hand:</span>
            <span className="ml-2 font-medium">
              {getNumericValue(formData.onHand)} {formData.unit}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Assigned:</span>
            <span className="ml-2 font-medium">
              {getNumericValue(formData.assigned)} {formData.unit}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Available:</span>
            <span className="ml-2 font-medium text-green-600">
              {formData.available} {formData.unit}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 font-medium ${
              getNumericValue(formData.onHand) <= getNumericValue(formData.minStock)
                ? 'text-red-600'
                : getNumericValue(formData.onHand) >= getNumericValue(formData.maxStock)
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}>
              {getNumericValue(formData.onHand) <= getNumericValue(formData.minStock)
                ? 'Low Stock'
                : getNumericValue(formData.onHand) >= getNumericValue(formData.maxStock)
                ? 'Overstock'
                : 'Normal'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTab;