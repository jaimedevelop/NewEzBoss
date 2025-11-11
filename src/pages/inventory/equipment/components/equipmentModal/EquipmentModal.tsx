// src/pages/inventory/equipment/components/equipmentModal/EquipmentModal.tsx
import React, { useMemo } from 'react';
import { X, Package, Store, DollarSign, Image } from 'lucide-react';
import { LoadingButton } from '../../../../../mainComponents/ui/LoadingButton';
import { EquipmentCreationProvider, useEquipmentCreation } from '../../../../../contexts/EquipmentCreationContext';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import GeneralTab from './GeneralTab';
import RentalTab from './RentalTab';
import PriceTab from './PriceTab';
import ImageTab from './ImageTab';
import {type EquipmentItem } from '../../../../../services/inventory/equipment/equipment.types';
import { createEquipmentItem, updateEquipmentItem} from '../../../../../services/inventory/equipment/equipment.mutations';

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  equipment?: EquipmentItem | null;
  title?: string;
  mode?: 'create' | 'edit' | 'view';
}

// Tab component with error indicators
function TabButton({ 
  id, 
  label, 
  icon: Icon,
  isActive, 
  onClick, 
  hasError,
  disabled 
}: { 
  id: string; 
  label: string; 
  icon: React.ComponentType<any>;
  isActive: boolean; 
  onClick: () => void;
  hasError?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-default' : ''}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {hasError && !disabled && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      )}
    </button>
  );
}

// Modal content component (needs to be inside the provider)
function EquipmentModalContent({ 
  onClose, 
  onSave, 
  equipment, 
  title,
  mode = 'create'
}: { 
  onClose: () => void; 
  onSave: () => void; 
  equipment?: EquipmentItem | null;
  title?: string;
  mode?: 'create' | 'edit' | 'view';
}) {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    setActiveTab, 
    validateForm, 
    setSubmitting, 
    resetForm,
    setFormData
  } = useEquipmentCreation();
  
  const { formData, activeTab, isSubmitting, isDirty } = state;
  const isViewMode = mode === 'view';

  // Determine the modal title based on mode
  const modalTitle = title || (
    mode === 'view' ? 'View Equipment' : 
    mode === 'edit' ? 'Edit Equipment' : 
    'Add New Equipment'
  );

  // Check for errors in each tab (only in non-view mode)
  const getTabErrors = (tabName: string) => {
    if (isViewMode) return false;
    
    const tabFieldMap: Record<string, string[]> = {
      general: ['name', 'equipmentType', 'tradeId', 'status', 'description', 'notes'],
      rental: ['dueDate'],
      price: ['minimumCustomerCharge', 'loanAmount', 'monthlyPayment', 'loanStartDate', 'loanPayoffDate', 'remainingBalance'],
      image: ['imageUrl']
    };
    
    const fields = tabFieldMap[tabName] || [];
    return fields.some(field => formData.errors[field]);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewMode) return;
    
    if (!validateForm()) {
      const tabsWithErrors = ['general', 'rental', 'price', 'image'].find(tab => getTabErrors(tab));
      if (tabsWithErrors) {
        setActiveTab(tabsWithErrors as any);
      }
      return;
    }

    setSubmitting(true);
    
    try {
      // Filter out empty rental entries (must have store name and at least one rate)
      const validRentalEntries = formData.rentalEntries
        .filter(entry => 
          entry.storeName.trim() && 
          (entry.dailyRate > 0 || entry.weeklyRate > 0 || entry.monthlyRate > 0)
        );

      // Prepare equipment data for database - build object conditionally to avoid undefined values
      const equipmentForDatabase: any = {
        name: formData.name,
        description: formData.description,
        notes: formData.notes,
        equipmentType: formData.equipmentType,
        tradeId: formData.tradeId,
        tradeName: formData.tradeName,
        sectionId: formData.sectionId,
        sectionName: formData.sectionName,
        categoryId: formData.categoryId,
        categoryName: formData.categoryName,
        subcategoryId: formData.subcategoryId,
        subcategoryName: formData.subcategoryName,
        status: formData.status,
        minimumCustomerCharge: formData.minimumCustomerCharge,
        isPaidOff: formData.isPaidOff,
        imageUrl: formData.imageUrl
      };

      // Only add optional fields if they have values (avoid undefined in Firebase)
      if (formData.dueDate) {
        equipmentForDatabase.dueDate = formData.dueDate;
      }
      
      if (validRentalEntries.length > 0) {
        equipmentForDatabase.rentalEntries = validRentalEntries;
      }
      
      if (formData.loanAmount > 0) {
        equipmentForDatabase.loanAmount = formData.loanAmount;
      }
      
      if (formData.monthlyPayment > 0) {
        equipmentForDatabase.monthlyPayment = formData.monthlyPayment;
      }
      
      if (formData.loanStartDate) {
        equipmentForDatabase.loanStartDate = formData.loanStartDate;
      }
      
      if (formData.loanPayoffDate) {
        equipmentForDatabase.loanPayoffDate = formData.loanPayoffDate;
      }
      
      if (formData.remainingBalance > 0) {
        equipmentForDatabase.remainingBalance = formData.remainingBalance;
      }

      let result;
      if (mode === 'edit' && equipment?.id) {
        result = await updateEquipmentItem(equipment.id, equipmentForDatabase);
      } else {
        result = await createEquipmentItem(equipmentForDatabase, currentUser!.uid);
      }

      if (result.success) {
        onSave();
        resetForm();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to save equipment');
      }
    } catch (error) {
      console.error('Error submitting equipment:', error);
      alert(`Error saving equipment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isViewMode) {
      resetForm();
      onClose();
      return;
    }
    
    if (isDirty) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    resetForm();
    onClose();
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Package },
    { id: 'rental' as const, label: 'Rental', icon: Store },
    { id: 'price' as const, label: 'Pricing', icon: DollarSign },
    { id: 'image' as const, label: 'Image', icon: Image }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab disabled={isViewMode} />;
      case 'rental':
        return <RentalTab disabled={isViewMode} />;
      case 'price':
        return <PriceTab disabled={isViewMode} />;
      case 'image':
        return <ImageTab disabled={isViewMode} />;
      default:
        return <GeneralTab disabled={isViewMode} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                hasError={getTabErrors(tab.id)}
                disabled={false}
              />
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 min-h-[300px]">
              {renderTabContent()}
            </div>
          </div>

          {/* Footer */}
          {!isViewMode && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {mode === 'edit' ? 'Update Equipment' : 'Create Equipment'}
              </LoadingButton>
            </div>
          )}
          
          {/* View mode footer */}
          {isViewMode && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// Main component with provider wrapper
const EquipmentModal: React.FC<EquipmentModalProps> = ({ isOpen, onClose, onSave, equipment, title, mode = 'create' }) => {
  if (!isOpen) return null;

  // Prepare initial equipment data
  const initialEquipmentData = useMemo(() => {
    if (equipment) {
      return {
        id: equipment.id,
        name: equipment.name || '',
        description: equipment.description || '',
        notes: equipment.notes || '',
        equipmentType: equipment.equipmentType || 'owned',
        tradeId: equipment.tradeId || '',
        tradeName: equipment.tradeName || '',
        sectionId: equipment.sectionId || '',
        sectionName: equipment.sectionName || '',
        categoryId: equipment.categoryId || '',
        categoryName: equipment.categoryName || '',
        subcategoryId: equipment.subcategoryId || '',
        subcategoryName: equipment.subcategoryName || '',
        status: equipment.status || 'available',
        dueDate: equipment.dueDate || '',
        rentalEntries: equipment.rentalEntries || [],
        minimumCustomerCharge: equipment.minimumCustomerCharge || 0,
        isPaidOff: equipment.isPaidOff ?? true,
        loanAmount: equipment.loanAmount || 0,
        monthlyPayment: equipment.monthlyPayment || 0,
        loanStartDate: equipment.loanStartDate || '',
        loanPayoffDate: equipment.loanPayoffDate || '',
        remainingBalance: equipment.remainingBalance || 0,
        imageUrl: equipment.imageUrl || ''
      };
    }
    return undefined;
  }, [equipment]);

  return (
    <EquipmentCreationProvider initialEquipment={initialEquipmentData}>
      <EquipmentModalContent 
        onClose={onClose}
        onSave={onSave}
        equipment={equipment}
        title={title}
        mode={mode}
      />
    </EquipmentCreationProvider>
  );
};

export default EquipmentModal;