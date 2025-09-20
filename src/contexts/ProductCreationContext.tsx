import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo } from 'react';

// SKU Entry interface to match your current structure
export interface SKUEntry {
  id: string;
  store: string;
  sku: string;
}

// Price Entry interface for local price management
export interface LocalPriceEntry {
  id: string;
  store: string;
  price: string;
  isNew?: boolean;
}

// Updated ProductFormData to match your actual structure
export interface ProductFormData {
  // General Tab
  id?: string;
  name: string;
  brand: string; // NEW - Added brand field
  trade: string;
  section: string;
  category: string;
  subcategory: string;
  type: string;
  size?: string;
  description: string;
  unit: string;
  
  // Price Tab
  unitPrice: number;
  priceEntries: LocalPriceEntry[];
  
  // SKU Tab
  sku: string;
  skus?: SKUEntry[];
  barcode?: string;
  
  // Stock Tab
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  location: string;
  lastUpdated: string;
  
  // Validation state
  errors: Record<string, string>;
}

export interface ProductCreationState {
  formData: ProductFormData;
  activeTab: 'general' | 'sku' | 'stock' | 'price' | 'history';
  isSubmitting: boolean;
  isDirty: boolean;
  
  // Hierarchical data states - moved to context to persist across tabs
  selectedTradeId: string;
  selectedSectionId: string;
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  
  // Loading states
  isLoadingTrades: boolean;
  isLoadingSections: boolean;
  isLoadingCategories: boolean;
  isLoadingSubcategories: boolean;
  isLoadingTypes: boolean;
  isLoadingSizes: boolean;
  isLoadingStores: boolean;
  isLoadingLocations: boolean;
}

// Action types
type ProductCreationAction =
  | { type: 'UPDATE_FIELD'; field: keyof ProductFormData; value: any }
  | { type: 'UPDATE_PRICE_ENTRY'; id: string; field: 'store' | 'price'; value: string }
  | { type: 'ADD_PRICE_ENTRY' }
  | { type: 'REMOVE_PRICE_ENTRY'; id: string }
  | { type: 'UPDATE_SKU_ENTRY'; id: string; field: 'store' | 'sku'; value: string }
  | { type: 'ADD_SKU_ENTRY' }
  | { type: 'REMOVE_SKU_ENTRY'; id: string }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SET_ACTIVE_TAB'; tab: 'general' | 'sku' | 'stock' | 'price' }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'SET_HIERARCHY_SELECTION'; level: 'trade' | 'section' | 'category' | 'subcategory'; id: string }
  | { type: 'SET_LOADING_STATE'; loader: string; isLoading: boolean }
  | { type: 'RESET_FORM' }
  | { type: 'INITIALIZE_FORM'; data: Partial<ProductFormData> };

// Initial state
const initialFormData: ProductFormData = {
  name: '',
  brand: '', // NEW - Added brand field
  trade: '',
  section: '',
  category: '',
  subcategory: '',
  type: '',
  size: '',
  description: '',
  unit: 'Each',
  unitPrice: 0,
  priceEntries: [],
  sku: '',
  skus: [{ id: '1', store: '', sku: '' }],
  barcode: '',
  onHand: 0,
  assigned: 0,
  available: 0,
  minStock: 0,
  maxStock: 0,
  location: '',
  lastUpdated: new Date().toISOString().split('T')[0],
  errors: {}
};

const initialState: ProductCreationState = {
  formData: initialFormData,
  activeTab: 'general',
  isSubmitting: false,
  isDirty: false,
  selectedTradeId: '',
  selectedSectionId: '',
  selectedCategoryId: '',
  selectedSubcategoryId: '',
  isLoadingTrades: false,
  isLoadingSections: false,
  isLoadingCategories: false,
  isLoadingSubcategories: false,
  isLoadingTypes: false,
  isLoadingSizes: false,
  isLoadingStores: false,
  isLoadingLocations: false
};

// Reducer
function productCreationReducer(
  state: ProductCreationState,
  action: ProductCreationAction
): ProductCreationState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      const updatedFormData = {
        ...state.formData,
        [action.field]: action.value,
        errors: {
          ...state.formData.errors,
          [action.field]: '' // Clear error when field is updated
        }
      };

      // Auto-calculate available quantity when onHand or assigned changes
      if (action.field === 'onHand' || action.field === 'assigned') {
        updatedFormData.available = updatedFormData.onHand - updatedFormData.assigned;
      }

      return {
        ...state,
        formData: updatedFormData,
        isDirty: true
      };

    case 'UPDATE_PRICE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          priceEntries: state.formData.priceEntries.map(entry =>
            entry.id === action.id ? { ...entry, [action.field]: action.value } : entry
          )
        },
        isDirty: true
      };

    case 'ADD_PRICE_ENTRY':
      const newPriceId = Date.now().toString();
      return {
        ...state,
        formData: {
          ...state.formData,
          priceEntries: [...state.formData.priceEntries, { id: newPriceId, store: '', price: '', isNew: true }]
        },
        isDirty: true
      };

    case 'REMOVE_PRICE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          priceEntries: state.formData.priceEntries.filter(entry => entry.id !== action.id)
        },
        isDirty: true
      };

    case 'UPDATE_SKU_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          skus: state.formData.skus?.map(sku =>
            sku.id === action.id ? { ...sku, [action.field]: action.value } : sku
          ) || []
        },
        isDirty: true
      };

    case 'ADD_SKU_ENTRY':
      const newSKUId = (Math.max(...(state.formData.skus || []).map(s => parseInt(s.id)), 0) + 1).toString();
      return {
        ...state,
        formData: {
          ...state.formData,
          skus: [...(state.formData.skus || []), { id: newSKUId, store: '', sku: '' }]
        },
        isDirty: true
      };

    case 'REMOVE_SKU_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          skus: state.formData.skus?.filter(sku => sku.id !== action.id) || []
        },
        isDirty: true
      };

    case 'SET_ERRORS':
      return {
        ...state,
        formData: {
          ...state.formData,
          errors: action.errors
        }
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        formData: {
          ...state.formData,
          errors: {
            ...state.formData.errors,
            [action.field]: ''
          }
        }
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.tab
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting
      };

    case 'SET_HIERARCHY_SELECTION':
      const updates: Partial<ProductCreationState> = {};
      
      switch (action.level) {
        case 'trade':
          updates.selectedTradeId = action.id;
          updates.selectedSectionId = '';
          updates.selectedCategoryId = '';
          updates.selectedSubcategoryId = '';
          break;
        case 'section':
          updates.selectedSectionId = action.id;
          updates.selectedCategoryId = '';
          updates.selectedSubcategoryId = '';
          break;
        case 'category':
          updates.selectedCategoryId = action.id;
          updates.selectedSubcategoryId = '';
          break;
        case 'subcategory':
          updates.selectedSubcategoryId = action.id;
          break;
      }

      return { ...state, ...updates };

    case 'SET_LOADING_STATE':
      return {
        ...state,
        [action.loader as keyof ProductCreationState]: action.isLoading
      };

    case 'INITIALIZE_FORM':
      return {
        ...state,
        formData: {
          ...state.formData,
          ...action.data
        },
        isDirty: false
      };

    case 'RESET_FORM':
      return {
        ...initialState,
        activeTab: state.activeTab // Keep the current tab when resetting
      };

    default:
      return state;
  }
}

// Context
interface ProductCreationContextType {
  state: ProductCreationState;
  
  // Basic field updates
  updateField: (field: keyof ProductFormData, value: any) => void;
  
  // Price management
  updatePriceEntry: (id: string, field: 'store' | 'price', value: string) => void;
  addPriceEntry: () => void;
  removePriceEntry: (id: string) => void;
  
  // SKU management
  updateSKUEntry: (id: string, field: 'store' | 'sku', value: string) => void;
  addSKUEntry: () => void;
  removeSKUEntry: (id: string) => void;
  
  // Error management
  setErrors: (errors: Record<string, string>) => void;
  clearError: (field: string) => void;
  
  // Navigation
  setActiveTab: (tab: 'general' | 'sku' | 'stock' | 'price') => void;
  
  // State management
  setSubmitting: (isSubmitting: boolean) => void;
  setHierarchySelection: (level: 'trade' | 'section' | 'category' | 'subcategory', id: string) => void;
  setLoadingState: (loader: string, isLoading: boolean) => void;
  initializeForm: (data: Partial<ProductFormData>) => void;
  resetForm: () => void;
  
  // Validation
  validateField: (field: keyof ProductFormData, value: any) => string;
  validateForm: () => boolean;
}

const ProductCreationContext = createContext<ProductCreationContextType | undefined>(undefined);

// Provider component
interface ProductCreationProviderProps {
  children: ReactNode;
}

export function ProductCreationProvider({ children }: ProductCreationProviderProps) {
  const [state, dispatch] = useReducer(productCreationReducer, initialState);

  const updateField = useCallback((field: keyof ProductFormData, value: any) => {
    console.log(`🔧 updateField called: ${field} =`, value);
    dispatch({ type: 'UPDATE_FIELD', field, value });
  }, []);

  const updatePriceEntry = useCallback((id: string, field: 'store' | 'price', value: string) => {
    dispatch({ type: 'UPDATE_PRICE_ENTRY', id, field, value });
  }, []);

  const addPriceEntry = useCallback(() => {
    dispatch({ type: 'ADD_PRICE_ENTRY' });
  }, []);

  const removePriceEntry = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PRICE_ENTRY', id });
  }, []);

  const updateSKUEntry = useCallback((id: string, field: 'store' | 'sku', value: string) => {
    dispatch({ type: 'UPDATE_SKU_ENTRY', id, field, value });
  }, []);

  const addSKUEntry = useCallback(() => {
    dispatch({ type: 'ADD_SKU_ENTRY' });
  }, []);

  const removeSKUEntry = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_SKU_ENTRY', id });
  }, []);

  const setErrors = useCallback((errors: Record<string, string>) => {
    dispatch({ type: 'SET_ERRORS', errors });
  }, []);

  const clearError = useCallback((field: string) => {
    dispatch({ type: 'CLEAR_ERROR', field });
  }, []);

  const setActiveTab = useCallback((tab: 'general' | 'sku' | 'stock' | 'price') => {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting });
  }, []);

  const setHierarchySelection = useCallback((level: 'trade' | 'section' | 'category' | 'subcategory', id: string) => {
    dispatch({ type: 'SET_HIERARCHY_SELECTION', level, id });
  }, []);

  const setLoadingState = useCallback((loader: string, isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING_STATE', loader, isLoading });
  }, []);

  const initializeForm = useCallback((data: Partial<ProductFormData>) => {
    dispatch({ type: 'INITIALIZE_FORM', data });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  // Validation functions
  const validateField = (field: keyof ProductFormData, value: any): string => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) {
          return 'Product name is required';
        }
        if (value.trim().length < 2) {
          return 'Product name must be at least 2 characters';
        }
        return '';

      case 'trade':
        if (!value || value.trim().length === 0) {
          return 'Trade is required';
        }
        return '';

      case 'unit':
        if (!value || value.trim().length === 0) {
          return 'Unit is required';
        }
        return '';

      case 'unitPrice':
        if (value < 0) {
          return 'Price cannot be negative';
        }
        return '';

      case 'onHand':
      case 'assigned':
      case 'minStock':
      case 'maxStock':
        if (value < 0) {
          return 'Quantity cannot be negative';
        }
        return '';

      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    console.log('=== FORM VALIDATION DEBUG ===');
    console.log('Current form data:', state.formData);
    
    const errors: Record<string, string> = {};
    
    // Validate required fields
    const fieldsToValidate: (keyof ProductFormData)[] = [
      'name', 'trade' // Removed 'unit' since it's no longer in GeneralTab
    ];
    
    fieldsToValidate.forEach(field => {
      const fieldValue = state.formData[field];
      console.log(`Validating field "${field}":`, fieldValue);
      
      const error = validateField(field, fieldValue);
      console.log(`Validation result for "${field}":`, error || 'Valid');
      
      if (error) {
        errors[field] = error;
      }
    });

    // Validate price if provided
    if (state.formData.unitPrice) {
      const priceError = validateField('unitPrice', state.formData.unitPrice);
      if (priceError) {
        errors.unitPrice = priceError;
      }
    }

    console.log('Final validation errors:', errors);
    console.log('Form is valid:', Object.keys(errors).length === 0);
    console.log('=== END VALIDATION DEBUG ===');

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const contextValue: ProductCreationContextType = useMemo(() => ({
    state,
    updateField,
    updatePriceEntry,
    addPriceEntry,
    removePriceEntry,
    updateSKUEntry,
    addSKUEntry,
    removeSKUEntry,
    setErrors,
    clearError,
    setActiveTab,
    setSubmitting,
    setHierarchySelection,
    setLoadingState,
    initializeForm,
    resetForm,
    validateField,
    validateForm
  }), [
    state,
    updateField,
    updatePriceEntry,
    addPriceEntry,
    removePriceEntry,
    updateSKUEntry,
    addSKUEntry,
    removeSKUEntry,
    setErrors,
    clearError,
    setActiveTab,
    setSubmitting,
    setHierarchySelection,
    setLoadingState,
    initializeForm,
    resetForm
  ]);

  return (
    <ProductCreationContext.Provider value={contextValue}>
      {children}
    </ProductCreationContext.Provider>
  );
}

// Custom hook to use the context
export function useProductCreation() {
  const context = useContext(ProductCreationContext);
  if (context === undefined) {
    throw new Error('useProductCreation must be used within a ProductCreationProvider');
  }
  return context;
}