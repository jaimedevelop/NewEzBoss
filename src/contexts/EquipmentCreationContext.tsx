// src/contexts/EquipmentCreationContext.tsx

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { EquipmentItem, RentalEntry } from '../services/inventory/equipment';

// Form data interface
interface EquipmentFormData {
  id?: string;
  
  // Basic Info
  name: string;
  description: string;
  notes: string;
  
  // Equipment Type
  equipmentType: 'owned' | 'rented';
  
  // Hierarchy - Store IDs + cached names
  tradeId: string;
  tradeName: string;
  sectionId: string;
  sectionName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  
  // Status
  status: string;
  
  // Due Date (for rented equipment)
  dueDate: string;
  
  // Rental Entries - Multiple rental store options
  rentalEntries: RentalEntry[];
  
  // Customer Pricing
  minimumCustomerCharge: number;
  
  // Loan Information
  isPaidOff: boolean;
  loanAmount: number;
  monthlyPayment: number;
  loanStartDate: string;
  loanPayoffDate: string;
  remainingBalance: number;
  
  // Image
  imageUrl: string;
  
  // Validation errors
  errors: Record<string, string>;
}

// Initial form state
const initialFormData: EquipmentFormData = {
  name: '',
  description: '',
  notes: '',
  equipmentType: 'owned',
  tradeId: '',
  tradeName: '',
  sectionId: '',
  sectionName: '',
  categoryId: '',
  categoryName: '',
  subcategoryId: '',
  subcategoryName: '',
  status: '',
  dueDate: '',
  rentalEntries: [],
  minimumCustomerCharge: 0,
  isPaidOff: true,
  loanAmount: 0,
  monthlyPayment: 0,
  loanStartDate: '',
  loanPayoffDate: '',
  remainingBalance: 0,
  imageUrl: '',
  errors: {}
};

// Context state interface
interface EquipmentCreationState {
  formData: EquipmentFormData;
  activeTab: 'general' | 'rental' | 'price' | 'image';
  isSubmitting: boolean;
  isDirty: boolean;
}

// Context methods interface
interface EquipmentCreationContextType {
  state: EquipmentCreationState;
  updateField: (field: keyof EquipmentFormData, value: any) => void;
  setActiveTab: (tab: 'general' | 'rental' | 'price' | 'image') => void;
  validateForm: () => boolean;
  setSubmitting: (isSubmitting: boolean) => void;
  resetForm: () => void;
  setFormData: (data: Partial<EquipmentFormData>) => void;
  addRentalEntry: () => void;
  removeRentalEntry: (id: string) => void;
  updateRentalEntry: (id: string, field: keyof RentalEntry, value: any) => void;
}

// Create context
const EquipmentCreationContext = createContext<EquipmentCreationContextType | undefined>(undefined);

// Provider props
interface EquipmentCreationProviderProps {
  children: React.ReactNode;
  initialEquipment?: Partial<EquipmentFormData>;
}

// Provider component
export const EquipmentCreationProvider: React.FC<EquipmentCreationProviderProps> = ({ 
  children,
  initialEquipment 
}) => {
  const [state, setState] = useState<EquipmentCreationState>({
    formData: initialEquipment ? { ...initialFormData, ...initialEquipment } : initialFormData,
    activeTab: 'general',
    isSubmitting: false,
    isDirty: false
  });

  // Update form data when initialEquipment changes (for edit mode)
  useEffect(() => {
    if (initialEquipment) {
      setState(prev => ({
        ...prev,
        formData: { ...initialFormData, ...initialEquipment },
        isDirty: false
      }));
    }
  }, [initialEquipment?.id]);

  // Update a single field
  const updateField = useCallback((field: keyof EquipmentFormData, value: any) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
        errors: {
          ...prev.formData.errors,
          [field]: ''
        }
      },
      isDirty: true
    }));
  }, []);

  // Set entire form data (for loading existing equipment)
  const setFormData = useCallback((data: Partial<EquipmentFormData>) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...data
      },
      isDirty: false
    }));
  }, []);

  // Add rental entry
  const addRentalEntry = useCallback(() => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        rentalEntries: [
          ...prev.formData.rentalEntries,
          {
            id: `rental_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            storeName: '',
            dailyRate: 0,
            weeklyRate: 0,
            monthlyRate: 0,
            pickupFee: 0,
            deliveryFee: 0,
            extraFees: 0
          }
        ]
      },
      isDirty: true
    }));
  }, []);

  // Remove rental entry
  const removeRentalEntry = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        rentalEntries: prev.formData.rentalEntries.filter(entry => entry.id !== id)
      },
      isDirty: true
    }));
  }, []);

  // Update rental entry
  const updateRentalEntry = useCallback((id: string, field: keyof RentalEntry, value: any) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        rentalEntries: prev.formData.rentalEntries.map(entry =>
          entry.id === id ? { ...entry, [field]: value } : entry
        )
      },
      isDirty: true
    }));
  }, []);

  // Set active tab
  const setActiveTab = useCallback((tab: 'general' | 'rental' | 'price' | 'image') => {
    setState(prev => ({
      ...prev,
      activeTab: tab
    }));
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const { formData } = state;

    // Required fields
    if (!formData.name.trim()) {
      errors.name = 'Equipment name is required';
    }

    if (!formData.equipmentType) {
      errors.equipmentType = 'Equipment type is required';
    }

    if (!formData.tradeId) {
      errors.tradeId = 'Trade is required';
    }

    if (!formData.status) {
      errors.status = 'Status is required';
    }

    // Validate due date for rented equipment
    if (formData.equipmentType === 'rented' && !formData.dueDate) {
      errors.dueDate = 'Due date is required for rented equipment';
    }

    // Validate rental entries for rented equipment
    if (formData.equipmentType === 'rented') {
      formData.rentalEntries.forEach((entry, index) => {
        if (!entry.storeName.trim()) {
          errors[`rentalEntry_${index}_storeName`] = 'Store name is required';
        }
      });
    }

    // Validate loan fields if equipment is owned and not paid off
    if (formData.equipmentType === 'owned' && !formData.isPaidOff) {
      if (!formData.loanAmount || formData.loanAmount <= 0) {
        errors.loanAmount = 'Loan amount is required for equipment with active loans';
      }

      if (!formData.monthlyPayment || formData.monthlyPayment <= 0) {
        errors.monthlyPayment = 'Monthly payment is required for equipment with active loans';
      }

      if (!formData.loanStartDate) {
        errors.loanStartDate = 'Loan start date is required';
      }

      if (!formData.loanPayoffDate) {
        errors.loanPayoffDate = 'Loan payoff date is required';
      }
    }

    // Validate minimum customer charge
    if (formData.minimumCustomerCharge < 0) {
      errors.minimumCustomerCharge = 'Minimum customer charge cannot be negative';
    }

    // Update state with errors
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        errors
      }
    }));

    return Object.keys(errors).length === 0;
  }, [state.formData]);

  // Set submitting state
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState(prev => ({
      ...prev,
      isSubmitting
    }));
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setState({
      formData: initialFormData,
      activeTab: 'general',
      isSubmitting: false,
      isDirty: false
    });
  }, []);

  const value: EquipmentCreationContextType = {
    state,
    updateField,
    setActiveTab,
    validateForm,
    setSubmitting,
    resetForm,
    setFormData,
    addRentalEntry,
    removeRentalEntry,
    updateRentalEntry
  };

  return (
    <EquipmentCreationContext.Provider value={value}>
      {children}
    </EquipmentCreationContext.Provider>
  );
};

// Custom hook to use the context
export const useEquipmentCreation = () => {
  const context = useContext(EquipmentCreationContext);
  if (context === undefined) {
    throw new Error('useEquipmentCreation must be used within an EquipmentCreationProvider');
  }
  return context;
};