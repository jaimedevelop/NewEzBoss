// src/mobile/inventory/detailView/products/MobileStockTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../mainComponents/forms/SelectField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { getLocations, addLocation } from '../../../../services/inventory/products/locations';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';

interface MobileStockTabProps {
    disabled?: boolean;
}

const unitOptions = [
    'Each', 'Foot', 'Linear Foot', 'Square Foot', 'Cubic Foot',
    'Gallon', 'Pound', 'Box', 'Case', 'Roll', 'Sheet', 'Bag', 'Bundle',
];

const MobileStockTab: React.FC<MobileStockTabProps> = ({ disabled = false }) => {
    const { currentUser } = useAuthContext();
    const { state, updateField } = useProductCreation();
    const { formData } = state;

    const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const locationsLoaded = useRef(false);

    useEffect(() => {
        if (!currentUser?.uid || locationsLoaded.current) return;

        const loadLocations = async () => {
            setIsLoadingLocations(true);
            try {
                const result = await getLocations(currentUser.uid!);
                if (result.success && result.data) {
                    setLocationOptions(result.data.map(l => ({ value: l.name, label: l.name })));
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
        if (!currentUser?.uid || disabled)
            return { success: false, error: 'User not authenticated' };

        try {
            const result = await addLocation(locationName, currentUser.uid);
            if (result.success) {
                setLocationOptions(prev =>
                    [...prev, { value: locationName, label: locationName }].sort((a, b) =>
                        a.label.localeCompare(b.label)
                    )
                );
                return { success: true };
            }
            return { success: false, error: result.error || 'Failed to add location' };
        } catch (error) {
            console.error('Error adding new location:', error);
            return { success: false, error: 'Failed to add location' };
        }
    };

    const handleNumericChange = (fieldName: string, value: string) => {
        if (disabled) return;
        if (value === '') { updateField(fieldName, ''); return; }
        const n = parseInt(value);
        if (!isNaN(n)) updateField(fieldName, n);
    };

    const getDisplayValue = (value: any): string =>
        value === undefined || value === null || value === '' ? '' : String(value);

    const getNumericValue = (value: any): number => {
        if (value === undefined || value === null || value === '') return 0;
        const n = typeof value === 'number' ? value : parseInt(value);
        return isNaN(n) ? 0 : n;
    };

    const onHand = getNumericValue(formData.onHand);
    const assigned = getNumericValue(formData.assigned);
    const minStock = getNumericValue(formData.minStock);
    const maxStock = getNumericValue(formData.maxStock);

    const stockStatus =
        onHand <= minStock ? { label: 'Low Stock', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' }
            : onHand >= maxStock && maxStock > 0 ? { label: 'Overstock', color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' }
                : { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' };

    return (
        <div className="flex flex-col gap-4 px-4 pb-6">
            {/* Header */}
            <div className="pt-2">
                <h3 className="text-base font-semibold text-gray-900">Stock Information</h3>
            </div>

            {/* Stock summary card — top of mobile for quick visibility */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Stock Summary
                </h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">On Hand</span>
                        <span className="font-medium">{onHand} {formData.unit}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Assigned</span>
                        <span className="font-medium">{assigned} {formData.unit}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Available</span>
                        <span className="font-medium text-green-600">{formData.available} {formData.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Status</span>
                        <span className={`flex items-center gap-1 font-medium text-xs ${stockStatus.color}`}>
                            <span className={`w-2 h-2 rounded-full ${stockStatus.dot}`} />
                            {stockStatus.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3">
                <FormField label="Unit" required error={formData.errors.unit}>
                    <SelectField
                        value={formData.unit}
                        onChange={(e) => !disabled && updateField('unit', e.target.value)}
                        options={unitOptions.map(o => ({ value: o, label: o }))}
                        required
                        disabled={disabled}
                    />
                </FormField>

                <FormField label="Storage Location" error={formData.errors.location}>
                    {isLoadingLocations ? (
                        <InputField value="Loading locations..." disabled placeholder="Loading..." />
                    ) : (
                        <HierarchicalSelect
                            value={formData.location}
                            onChange={(value) => !disabled && updateField('location', value)}
                            options={locationOptions}
                            placeholder="Select or add location"
                            onAddNew={!disabled ? handleAddNewLocation : undefined}
                            disabled={disabled}
                        />
                    )}
                </FormField>

                {/* Quantity row */}
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="On Hand" error={formData.errors.onHand}>
                        <InputField
                            type="number"
                            min="0"
                            value={getDisplayValue(formData.onHand)}
                            onChange={(e) => handleNumericChange('onHand', e.target.value)}
                            placeholder="0"
                            error={!!formData.errors.onHand}
                            disabled={disabled}
                        />
                    </FormField>
                    <FormField label="Assigned" error={formData.errors.assigned}>
                        <InputField
                            type="number"
                            min="0"
                            value={getDisplayValue(formData.assigned)}
                            onChange={(e) => handleNumericChange('assigned', e.target.value)}
                            placeholder="0"
                            error={!!formData.errors.assigned}
                            disabled={disabled}
                        />
                    </FormField>
                </div>

                <FormField label="Available (auto-calculated)">
                    <InputField
                        type="number"
                        value={formData.available}
                        placeholder="Auto-calculated"
                        disabled
                        title="On-Hand minus Assigned"
                    />
                </FormField>

                {/* Min / Max row */}
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Min Stock" error={formData.errors.minStock}>
                        <InputField
                            type="number"
                            min="0"
                            value={getDisplayValue(formData.minStock)}
                            onChange={(e) => handleNumericChange('minStock', e.target.value)}
                            placeholder="0"
                            error={!!formData.errors.minStock}
                            disabled={disabled}
                        />
                    </FormField>
                    <FormField label="Max Stock" error={formData.errors.maxStock}>
                        <InputField
                            type="number"
                            min="0"
                            value={getDisplayValue(formData.maxStock)}
                            onChange={(e) => handleNumericChange('maxStock', e.target.value)}
                            placeholder="0"
                            error={!!formData.errors.maxStock}
                            disabled={disabled}
                        />
                    </FormField>
                </div>
            </div>
        </div>
    );
};

export default MobileStockTab;