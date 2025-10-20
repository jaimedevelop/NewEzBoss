// src/pages/inventory/equipment/components/equipmentModal/RentalTab.tsx
import React, { useState, useEffect } from 'react';
import { Store, MapPin, Calendar, DollarSign, User, Package } from 'lucide-react';
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
  const { state, updateField } = useEquipmentCreation();
  const { formData } = state;

  const [rentalStores, setRentalStores] = useState<RentalStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddStoreForm, setShowAddStoreForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreLocation, setNewStoreLocation] = useState('');

  const isRentedEquipment = formData.equipmentType === 'rented';

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

  // Handle rental store selection from dropdown
  const handleRentalStoreSelect = (storeName: string) => {
    if (disabled) return;
    
    const selectedStore = rentalStores.find(s => s.name === storeName);
    if (selectedStore) {
      updateField('rentalStoreName', selectedStore.name);
      updateField('rentalStoreLocation', selectedStore.location);
    }
  };

  // Handle adding new rental store
  const handleAddRentalStore = async (combinedValue: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    // For now, just set the name and let user fill location manually
    // Or we could show a dialog to get both name and location
    setShowAddStoreForm(true);
    setNewStoreName(combinedValue);
    return { success: false, error: 'Please provide store location' };
  };

  const handleSaveNewStore = async () => {
    if (!currentUser?.uid || !newStoreName.trim() || !newStoreLocation.trim()) {
      return;
    }

    const result = await addRentalStore(newStoreName.trim(), newStoreLocation.trim(), currentUser.uid);
    
    if (result.success) {
      // Reload stores
      const storesResult = await getRentalStores(currentUser.uid);
      if (storesResult.success && storesResult.data) {
        setRentalStores(storesResult.data);
      }
      
      // Set the new store as selected
      updateField('rentalStoreName', newStoreName.trim());
      updateField('rentalStoreLocation', newStoreLocation.trim());
      
      // Reset form
      setShowAddStoreForm(false);
      setNewStoreName('');
      setNewStoreLocation('');
    } else {
      alert(result.error || 'Failed to add rental store');
    }
  };

  return (
    <div className="space-y-6">
      {/* Equipment Type Notice */}
      <div className={`rounded-lg p-4 border-2 ${
        isRentedEquipment 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <Package className={`h-5 w-5 ${isRentedEquipment ? 'text-blue-600' : 'text-gray-500'}`} />
          <div>
            <p className={`font-medium ${isRentedEquipment ? 'text-blue-900' : 'text-gray-700'}`}>
              {isRentedEquipment ? 'Rented Equipment' : 'Owned Equipment'}
            </p>
            <p className={`text-sm ${isRentedEquipment ? 'text-blue-700' : 'text-gray-600'}`}>
              {isRentedEquipment 
                ? 'Fill in rental store details and pricing information below'
                : 'Rental information is disabled for owned equipment'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Rental Store Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Store className="h-5 w-5 text-gray-600" />
          <span>Rental Store Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField 
            label="Rental Store Name" 
            required={isRentedEquipment}
            error={formData.errors.rentalStoreName}
          >
            <HierarchicalSelect
              value={formData.rentalStoreName}
              onChange={handleRentalStoreSelect}
              options={rentalStores.map(store => ({
                value: store.name,
                label: `${store.name} - ${store.location}`,
                id: store.id
              }))}
              placeholder={isLoading ? "Loading..." : "Select or add rental store"}
              onAddNew={!disabled && isRentedEquipment ? handleAddRentalStore : undefined}
              disabled={disabled || !isRentedEquipment || isLoading}
              required={isRentedEquipment}
            />
          </FormField>

          <FormField 
            label="Store Location" 
            required={isRentedEquipment}
            error={formData.errors.rentalStoreLocation}
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <InputField
                value={formData.rentalStoreLocation}
                onChange={(e) => !disabled && isRentedEquipment && updateField('rentalStoreLocation', e.target.value)}
                placeholder="Store address or location"
                className="pl-10"
                disabled={disabled || !isRentedEquipment}
                required={isRentedEquipment}
                error={!!formData.errors.rentalStoreLocation}
              />
            </div>
          </FormField>
        </div>

        {/* Add New Store Form */}
        {showAddStoreForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-blue-900">Add New Rental Store</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InputField
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Store name"
              />
              <InputField
                value={newStoreLocation}
                onChange={(e) => setNewStoreLocation(e.target.value)}
                placeholder="Store location"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSaveNewStore}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Save Store
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddStoreForm(false);
                  setNewStoreName('');
                  setNewStoreLocation('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <FormField 
          label="Due Date" 
          required={isRentedEquipment}
          error={formData.errors.dueDate}
        >
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <InputField
              type="date"
              value={formData.dueDate}
              onChange={(e) => !disabled && isRentedEquipment && updateField('dueDate', e.target.value)}
              className="pl-10"
              disabled={disabled || !isRentedEquipment}
              required={isRentedEquipment}
              error={!!formData.errors.dueDate}
            />
          </div>
        </FormField>
      </div>

      {/* Rental Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-gray-600" />
          <span>Rental Pricing</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Daily Rate" error={formData.errors.dailyRate}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <InputField
                type="number"
                step="0.01"
                min="0"
                value={formData.dailyRate.toString()}
                onChange={(e) => !disabled && isRentedEquipment && updateField('dailyRate', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-8"
                disabled={disabled || !isRentedEquipment}
                error={!!formData.errors.dailyRate}
              />
            </div>
          </FormField>

          <FormField label="Weekly Rate" error={formData.errors.weeklyRate}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <InputField
                type="number"
                step="0.01"
                min="0"
                value={formData.weeklyRate.toString()}
                onChange={(e) => !disabled && isRentedEquipment && updateField('weeklyRate', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-8"
                disabled={disabled || !isRentedEquipment}
                error={!!formData.errors.weeklyRate}
              />
            </div>
          </FormField>

          <FormField label="Monthly Rate" error={formData.errors.monthlyRate}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <InputField
                type="number"
                step="0.01"
                min="0"
                value={formData.monthlyRate.toString()}
                onChange={(e) => !disabled && isRentedEquipment && updateField('monthlyRate', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-8"
                disabled={disabled || !isRentedEquipment}
                error={!!formData.errors.monthlyRate}
              />
            </div>
          </FormField>

          <FormField label="Pickup/Delivery Price" error={formData.errors.pickupDeliveryPrice}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <InputField
                type="number"
                step="0.01"
                min="0"
                value={formData.pickupDeliveryPrice.toString()}
                onChange={(e) => !disabled && isRentedEquipment && updateField('pickupDeliveryPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-8"
                disabled={disabled || !isRentedEquipment}
                error={!!formData.errors.pickupDeliveryPrice}
              />
            </div>
          </FormField>
        </div>
      </div>

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