// src/contexts/ToolCreationContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

// Form data structure
interface ToolFormData {
  // For editing existing tools
  id?: string;
  
  // Basic info
  name: string;
  brand: string;
  description: string;
  notes: string;
  
  // Hierarchy (store both IDs and names)
  tradeId: string;
  tradeName: string;
  sectionId: string;
  sectionName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  
  // Additional fields
  status: 'available' | 'in-use' | 'maintenance' | '';
  location: string;
  purchaseDate: string;
  warrantyExpiration: string;
  
  // Pricing
  minimumCustomerCharge: number;
  
  // Image
  imageUrl: string;
  
  // Validation
  errors: Record<string, string>;
}

// Context state structure
interface ToolCreationState {
  formData: ToolFormData;
  activeTab: 'general' | 'price' | 'image';
  isSubmitting: boolean;
  isDirty: boolean;
}

// Context methods
interface ToolCreationContextType {
  state: ToolCreationState;
  updateField: (field: keyof ToolFormData, value: any) => void;
  setFormData: (data: Partial<ToolFormData>) => void;
  resetForm: () => void;
  validateForm: () => boolean;
  setActiveTab: (tab: 'general' | 'price' | 'image') => void;
  setSubmitting: (loading: boolean) => void;
}

// Initial form data
const initialFormData: ToolFormData = {
  name: '',
  brand: '',
  description: '',
  notes: '',
  tradeId: '',
  tradeName: '',
  sectionId: '',
  sectionName: '',
  categoryId: '',
  categoryName: '',
  subcategoryId: '',
  subcategoryName: '',
  status: '',
  location: '',
  purchaseDate: new Date().toISOString().split('T')[0], // Today's date
  warrantyExpiration: '',
  minimumCustomerCharge: 0,
  imageUrl: '',
  errors: {}
};

// Create context
const ToolCreationContext = createContext<ToolCreationContextType | undefined>(undefined);

// Provider component
export const ToolCreationProvider: React.FC<{
  children: React.ReactNode;
  initialTool?: Partial<ToolFormData>;
}> = ({ children, initialTool }) => {
  const [state, setState] = useState<ToolCreationState>({
    formData: initialTool ? { ...initialFormData, ...initialTool } : initialFormData,
    activeTab: 'general',
    isSubmitting: false,
    isDirty: false
  });

  // Update a single field
  const updateField = useCallback((field: keyof ToolFormData, value: any) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
        errors: {
          ...prev.formData.errors,
          [field]: '' // Clear error for this field
        }
      },
      isDirty: true
    }));
  }, []);

  // Set multiple form fields at once (for editing)
  const setFormData = useCallback((data: Partial<ToolFormData>) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        ...data
      },
      isDirty: false // Not dirty when loading existing data
    }));
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setState({
      formData: initialFormData,
      activeTab: 'general',
      isSubmitting: false,
      isDirty: false
    });
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const { formData } = state;

    // Required fields
    if (!formData.name.trim()) {
      errors.name = 'Tool name is required';
    }

    if (!formData.tradeId) {
      errors.tradeId = 'Trade is required';
    }

    if (!formData.status) {
      errors.status = 'Status is required';
    }

    if (formData.minimumCustomerCharge < 0) {
      errors.minimumCustomerCharge = 'Minimum charge cannot be negative';
    }

    // Date validation
    if (formData.warrantyExpiration && formData.purchaseDate) {
      const purchase = new Date(formData.purchaseDate);
      const warranty = new Date(formData.warrantyExpiration);
      
      if (warranty < purchase) {
        errors.warrantyExpiration = 'Warranty expiration must be after purchase date';
      }
    }

    // URL validation (if provided)
    if (formData.imageUrl) {
      try {
        new URL(formData.imageUrl);
      } catch {
        errors.imageUrl = 'Please enter a valid URL';
      }
    }

    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        errors
      }
    }));

    return Object.keys(errors).length === 0;
  }, [state]);

  // Set active tab
  const setActiveTab = useCallback((tab: 'general' | 'price' | 'image') => {
    setState(prev => ({
      ...prev,
      activeTab: tab
    }));
  }, []);

  // Set submitting state
  const setSubmitting = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isSubmitting: loading
    }));
  }, []);

  const contextValue: ToolCreationContextType = {
    state,
    updateField,
    setFormData,
    resetForm,
    validateForm,
    setActiveTab,
    setSubmitting
  };

  return (
    <ToolCreationContext.Provider value={contextValue}>
      {children}
    </ToolCreationContext.Provider>
  );
};

// Hook to use the context
export const useToolCreation = (): ToolCreationContextType => {
  const context = useContext(ToolCreationContext);
  if (!context) {
    throw new Error('useToolCreation must be used within a ToolCreationProvider');
  }
  return context;
};