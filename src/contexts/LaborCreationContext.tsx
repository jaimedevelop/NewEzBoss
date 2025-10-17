// src/contexts/LaborCreationContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
interface FlatRateEntry {
  id: string;
  name: string;
  rate: string;
}

interface HourlyRateEntry {
  id: string;
  name: string;
  skillLevel: string;
  hourlyRate: string;
}

interface TaskEntry {
  id: string;
  name: string;
  description: string;
}

interface LaborFormData {
  name: string;
  description: string;
  trade: string;
  section: string;
  estimatedHours: string;
  flatRates: FlatRateEntry[];
  hourlyRates: HourlyRateEntry[];
  tasks: TaskEntry[];
  isActive: boolean;
}

interface LaborCreationState {
  formData: LaborFormData;
}

// Action Types
type LaborCreationAction =
  | { type: 'UPDATE_FORM_DATA'; field: keyof LaborFormData; value: any }
  | { type: 'RESET_FORM' }
  | { type: 'SET_FORM_DATA'; formData: LaborFormData }
  // Flat Rate Actions
  | { type: 'ADD_FLAT_RATE_ENTRY' }
  | { type: 'REMOVE_FLAT_RATE_ENTRY'; id: string }
  | { type: 'UPDATE_FLAT_RATE_ENTRY'; id: string; field: keyof FlatRateEntry; value: string }
  // Hourly Rate Actions
  | { type: 'ADD_HOURLY_RATE_ENTRY' }
  | { type: 'REMOVE_HOURLY_RATE_ENTRY'; id: string }
  | { type: 'UPDATE_HOURLY_RATE_ENTRY'; id: string; field: keyof HourlyRateEntry; value: string }
  // Task Actions
  | { type: 'ADD_TASK_ENTRY' }
  | { type: 'REMOVE_TASK_ENTRY'; id: string }
  | { type: 'UPDATE_TASK_ENTRY'; id: string; field: keyof TaskEntry; value: string };

// Initial State
const initialFormData: LaborFormData = {
  name: '',
  description: '',
  trade: '',
  section: '',
  estimatedHours: '',
  flatRates: [{ id: Date.now().toString(), name: '', rate: '' }],
  hourlyRates: [],
  tasks: [],
  isActive: true,
};

const initialState: LaborCreationState = {
  formData: initialFormData,
};

// Reducer
function laborCreationReducer(state: LaborCreationState, action: LaborCreationAction): LaborCreationState {
  switch (action.type) {
    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value,
        },
      };

    case 'SET_FORM_DATA':
      return {
        ...state,
        formData: action.formData,
      };

    case 'RESET_FORM':
      return {
        ...state,
        formData: initialFormData,
      };

    // Flat Rate Actions
    case 'ADD_FLAT_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          flatRates: [
            ...state.formData.flatRates,
            { id: Date.now().toString(), name: '', rate: '' },
          ],
        },
      };

    case 'REMOVE_FLAT_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          flatRates: state.formData.flatRates.filter((entry) => entry.id !== action.id),
        },
      };

    case 'UPDATE_FLAT_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          flatRates: state.formData.flatRates.map((entry) =>
            entry.id === action.id ? { ...entry, [action.field]: action.value } : entry
          ),
        },
      };

    // Hourly Rate Actions
    case 'ADD_HOURLY_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          hourlyRates: [
            ...state.formData.hourlyRates,
            { id: Date.now().toString(), name: '', skillLevel: '', hourlyRate: '' },
          ],
        },
      };

    case 'REMOVE_HOURLY_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          hourlyRates: state.formData.hourlyRates.filter((entry) => entry.id !== action.id),
        },
      };

    case 'UPDATE_HOURLY_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          hourlyRates: state.formData.hourlyRates.map((entry) =>
            entry.id === action.id ? { ...entry, [action.field]: action.value } : entry
          ),
        },
      };

    // Task Actions
    case 'ADD_TASK_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          tasks: [
            ...state.formData.tasks,
            { id: Date.now().toString(), name: '', description: '' },
          ],
        },
      };

    case 'REMOVE_TASK_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          tasks: state.formData.tasks.filter((entry) => entry.id !== action.id),
        },
      };

    case 'UPDATE_TASK_ENTRY':
      return {
        ...state,
        formData: {
          ...state.formData,
          tasks: state.formData.tasks.map((entry) =>
            entry.id === action.id ? { ...entry, [action.field]: action.value } : entry
          ),
        },
      };

    default:
      return state;
  }
}

// Context
interface LaborCreationContextType {
  state: LaborCreationState;
  updateFormData: (field: keyof LaborFormData, value: any) => void;
  resetForm: () => void;
  setFormData: (formData: LaborFormData) => void;
  // Flat Rate Methods
  addFlatRateEntry: () => void;
  removeFlatRateEntry: (id: string) => void;
  updateFlatRateEntry: (id: string, field: keyof FlatRateEntry, value: string) => void;
  // Hourly Rate Methods
  addHourlyRateEntry: () => void;
  removeHourlyRateEntry: (id: string) => void;
  updateHourlyRateEntry: (id: string, field: keyof HourlyRateEntry, value: string) => void;
  // Task Methods
  addTaskEntry: () => void;
  removeTaskEntry: (id: string) => void;
  updateTaskEntry: (id: string, field: keyof TaskEntry, value: string) => void;
}

const LaborCreationContext = createContext<LaborCreationContextType | undefined>(undefined);

// Provider
export const LaborCreationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(laborCreationReducer, initialState);

  const updateFormData = (field: keyof LaborFormData, value: any) => {
    dispatch({ type: 'UPDATE_FORM_DATA', field, value });
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  const setFormData = (formData: LaborFormData) => {
    dispatch({ type: 'SET_FORM_DATA', formData });
  };

  // Flat Rate Methods
  const addFlatRateEntry = () => {
    dispatch({ type: 'ADD_FLAT_RATE_ENTRY' });
  };

  const removeFlatRateEntry = (id: string) => {
    dispatch({ type: 'REMOVE_FLAT_RATE_ENTRY', id });
  };

  const updateFlatRateEntry = (id: string, field: keyof FlatRateEntry, value: string) => {
    dispatch({ type: 'UPDATE_FLAT_RATE_ENTRY', id, field, value });
  };

  // Hourly Rate Methods
  const addHourlyRateEntry = () => {
    dispatch({ type: 'ADD_HOURLY_RATE_ENTRY' });
  };

  const removeHourlyRateEntry = (id: string) => {
    dispatch({ type: 'REMOVE_HOURLY_RATE_ENTRY', id });
  };

  const updateHourlyRateEntry = (id: string, field: keyof HourlyRateEntry, value: string) => {
    dispatch({ type: 'UPDATE_HOURLY_RATE_ENTRY', id, field, value });
  };

  // Task Methods
  const addTaskEntry = () => {
    dispatch({ type: 'ADD_TASK_ENTRY' });
  };

  const removeTaskEntry = (id: string) => {
    dispatch({ type: 'REMOVE_TASK_ENTRY', id });
  };

  const updateTaskEntry = (id: string, field: keyof TaskEntry, value: string) => {
    dispatch({ type: 'UPDATE_TASK_ENTRY', id, field, value });
  };

  const value: LaborCreationContextType = {
    state,
    updateFormData,
    resetForm,
    setFormData,
    addFlatRateEntry,
    removeFlatRateEntry,
    updateFlatRateEntry,
    addHourlyRateEntry,
    removeHourlyRateEntry,
    updateHourlyRateEntry,
    addTaskEntry,
    removeTaskEntry,
    updateTaskEntry,
  };

  return (
    <LaborCreationContext.Provider value={value}>
      {children}
    </LaborCreationContext.Provider>
  );
};

// Hook
export const useLaborCreation = () => {
  const context = useContext(LaborCreationContext);
  if (context === undefined) {
    throw new Error('useLaborCreation must be used within a LaborCreationProvider');
  }
  return context;
};

export type { LaborFormData, FlatRateEntry, HourlyRateEntry, TaskEntry };