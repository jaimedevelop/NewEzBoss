import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { PricingStrategy, MeasurementUnit } from '../services/inventory/labor/labor.types';

// ─── Form-layer entry types (all numeric fields stored as strings) ────────────

export interface FlatRateEntry {
  id: string;
  name: string;
  rate: string;
}

export interface HourlyRateEntry {
  id: string;
  name: string;
  skillLevel: string;
  hourlyRate: string;
}

export interface TaskEntry {
  id: string;
  name: string;
  description: string;
}

export interface PricingProfileEntry {
  id: string;
  name: string;
  strategy: PricingStrategy;
  unit: MeasurementUnit | '';
  baseRate: string;
  minimumCharge: string;
  includedUnits: string;
  overageRate: string;
  isDefault: boolean;
}

export interface MaterialFormEntry {
  id: string;
  name: string;
  quantity: string;
  pricePerUnit: string;
  description: string;
}

// ─── Form data ────────────────────────────────────────────────────────────────

export interface LaborFormData {
  name: string;
  description: string;
  tradeId: string;
  tradeName: string;
  sectionId: string;
  sectionName: string;
  categoryId: string;
  categoryName: string;
  estimatedHours: string;
  flatRates: FlatRateEntry[];
  hourlyRates: HourlyRateEntry[];
  pricingProfiles: PricingProfileEntry[];
  materialEntries: MaterialFormEntry[];
  tasks: TaskEntry[];
  isActive: boolean;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface LaborCreationState {
  formData: LaborFormData;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type LaborCreationAction =
  | { type: 'UPDATE_FORM_DATA'; field: keyof LaborFormData; value: any }
  | { type: 'RESET_FORM' }
  | { type: 'SET_FORM_DATA'; formData: LaborFormData }
  // Flat Rate
  | { type: 'ADD_FLAT_RATE_ENTRY' }
  | { type: 'REMOVE_FLAT_RATE_ENTRY'; id: string }
  | { type: 'UPDATE_FLAT_RATE_ENTRY'; id: string; field: keyof FlatRateEntry; value: string }
  // Hourly Rate
  | { type: 'ADD_HOURLY_RATE_ENTRY' }
  | { type: 'REMOVE_HOURLY_RATE_ENTRY'; id: string }
  | { type: 'UPDATE_HOURLY_RATE_ENTRY'; id: string; field: keyof HourlyRateEntry; value: string }
  // Pricing Profiles
  | { type: 'ADD_PRICING_PROFILE_ENTRY' }
  | { type: 'REMOVE_PRICING_PROFILE_ENTRY'; id: string }
  | { type: 'UPDATE_PRICING_PROFILE_ENTRY'; id: string; field: keyof PricingProfileEntry; value: any }
  | { type: 'SET_DEFAULT_PRICING_PROFILE'; id: string }
  | { type: 'SET_PRICING_PROFILES'; profiles: PricingProfileEntry[] }
  // Materials
  | { type: 'ADD_MATERIAL_ENTRY' }
  | { type: 'REMOVE_MATERIAL_ENTRY'; id: string }
  | { type: 'UPDATE_MATERIAL_ENTRY'; id: string; field: keyof MaterialFormEntry; value: string }
  // Tasks
  | { type: 'ADD_TASK_ENTRY' }
  | { type: 'REMOVE_TASK_ENTRY'; id: string }
  | { type: 'UPDATE_TASK_ENTRY'; id: string; field: keyof TaskEntry; value: string };

// ─── Initial state ────────────────────────────────────────────────────────────

const initialFormData: LaborFormData = {
  name: '',
  description: '',
  tradeId: '',
  tradeName: '',
  sectionId: '',
  sectionName: '',
  categoryId: '',
  categoryName: '',
  estimatedHours: '',
  flatRates: [{ id: Date.now().toString(), name: '', rate: '' }],
  hourlyRates: [],
  pricingProfiles: [],
  materialEntries: [],
  tasks: [],
  isActive: true,
};

const initialState: LaborCreationState = { formData: initialFormData };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
}

function blankPricingProfile(isFirst: boolean): PricingProfileEntry {
  return {
    id: genId(),
    name: '',
    strategy: 'flat',
    unit: '',
    baseRate: '',
    minimumCharge: '',
    includedUnits: '',
    overageRate: '',
    isDefault: isFirst,
  };
}

function blankMaterialEntry(): MaterialFormEntry {
  return { id: genId(), name: '', quantity: '', pricePerUnit: '', description: '' };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function laborCreationReducer(state: LaborCreationState, action: LaborCreationAction): LaborCreationState {
  const fd = state.formData;

  switch (action.type) {
    case 'UPDATE_FORM_DATA':
      return { ...state, formData: { ...fd, [action.field]: action.value } };

    case 'SET_FORM_DATA':
      return { ...state, formData: action.formData };

    case 'RESET_FORM':
      return { ...state, formData: initialFormData };

    // ── Flat Rate ──────────────────────────────────────────────────────────────
    case 'ADD_FLAT_RATE_ENTRY':
      return { ...state, formData: { ...fd, flatRates: [...fd.flatRates, { id: genId(), name: '', rate: '' }] } };

    case 'REMOVE_FLAT_RATE_ENTRY':
      return { ...state, formData: { ...fd, flatRates: fd.flatRates.filter(e => e.id !== action.id) } };

    case 'UPDATE_FLAT_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...fd,
          flatRates: fd.flatRates.map(e => e.id === action.id ? { ...e, [action.field]: action.value } : e),
        },
      };

    // ── Hourly Rate ────────────────────────────────────────────────────────────
    case 'ADD_HOURLY_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...fd,
          hourlyRates: [...fd.hourlyRates, { id: genId(), name: '', skillLevel: '', hourlyRate: '' }],
        },
      };

    case 'REMOVE_HOURLY_RATE_ENTRY':
      return { ...state, formData: { ...fd, hourlyRates: fd.hourlyRates.filter(e => e.id !== action.id) } };

    case 'UPDATE_HOURLY_RATE_ENTRY':
      return {
        ...state,
        formData: {
          ...fd,
          hourlyRates: fd.hourlyRates.map(e => e.id === action.id ? { ...e, [action.field]: action.value } : e),
        },
      };

    // ── Pricing Profiles ───────────────────────────────────────────────────────
    case 'ADD_PRICING_PROFILE_ENTRY':
      return {
        ...state,
        formData: {
          ...fd,
          pricingProfiles: [...fd.pricingProfiles, blankPricingProfile(fd.pricingProfiles.length === 0)],
        },
      };

    case 'REMOVE_PRICING_PROFILE_ENTRY': {
      const next = fd.pricingProfiles.filter(p => p.id !== action.id);
      if (next.length > 0 && !next.some(p => p.isDefault)) next[0] = { ...next[0], isDefault: true };
      return { ...state, formData: { ...fd, pricingProfiles: next } };
    }

    case 'UPDATE_PRICING_PROFILE_ENTRY':
      return {
        ...state,
        formData: {
          ...fd,
          pricingProfiles: fd.pricingProfiles.map(p =>
            p.id === action.id ? { ...p, [action.field]: action.value } : p
          ),
        },
      };

    case 'SET_DEFAULT_PRICING_PROFILE':
      return {
        ...state,
        formData: {
          ...fd,
          pricingProfiles: fd.pricingProfiles.map(p => ({ ...p, isDefault: p.id === action.id })),
        },
      };

    // Bulk-replace all profiles — used when applying a template
    case 'SET_PRICING_PROFILES':
      return { ...state, formData: { ...fd, pricingProfiles: action.profiles } };

    // ── Materials ──────────────────────────────────────────────────────────────
    case 'ADD_MATERIAL_ENTRY':
      return { ...state, formData: { ...fd, materialEntries: [...fd.materialEntries, blankMaterialEntry()] } };

    case 'REMOVE_MATERIAL_ENTRY':
      return { ...state, formData: { ...fd, materialEntries: fd.materialEntries.filter(m => m.id !== action.id) } };

    case 'UPDATE_MATERIAL_ENTRY':
      return {
        ...state,
        formData: {
          ...fd,
          materialEntries: fd.materialEntries.map(m =>
            m.id === action.id ? { ...m, [action.field]: action.value } : m
          ),
        },
      };

    // ── Tasks ──────────────────────────────────────────────────────────────────
    case 'ADD_TASK_ENTRY':
      return { ...state, formData: { ...fd, tasks: [...fd.tasks, { id: genId(), name: '', description: '' }] } };

    case 'REMOVE_TASK_ENTRY':
      return { ...state, formData: { ...fd, tasks: fd.tasks.filter(e => e.id !== action.id) } };

    case 'UPDATE_TASK_ENTRY':
      return {
        ...state,
        formData: {
          ...fd,
          tasks: fd.tasks.map(e => e.id === action.id ? { ...e, [action.field]: action.value } : e),
        },
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface LaborCreationContextType {
  state: LaborCreationState;
  updateFormData: (field: keyof LaborFormData, value: any) => void;
  resetForm: () => void;
  setFormData: (formData: LaborFormData) => void;
  // Flat Rate
  addFlatRateEntry: () => void;
  removeFlatRateEntry: (id: string) => void;
  updateFlatRateEntry: (id: string, field: keyof FlatRateEntry, value: string) => void;
  // Hourly Rate
  addHourlyRateEntry: () => void;
  removeHourlyRateEntry: (id: string) => void;
  updateHourlyRateEntry: (id: string, field: keyof HourlyRateEntry, value: string) => void;
  // Pricing Profiles
  addPricingProfileEntry: () => void;
  removePricingProfileEntry: (id: string) => void;
  updatePricingProfileEntry: (id: string, field: keyof PricingProfileEntry, value: any) => void;
  setDefaultPricingProfile: (id: string) => void;
  setPricingProfiles: (profiles: PricingProfileEntry[]) => void;
  // Materials
  addMaterialEntry: () => void;
  removeMaterialEntry: (id: string) => void;
  updateMaterialEntry: (id: string, field: keyof MaterialFormEntry, value: string) => void;
  // Tasks
  addTaskEntry: () => void;
  removeTaskEntry: (id: string) => void;
  updateTaskEntry: (id: string, field: keyof TaskEntry, value: string) => void;
}

const LaborCreationContext = createContext<LaborCreationContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const LaborCreationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(laborCreationReducer, initialState);

  const value: LaborCreationContextType = {
    state,
    updateFormData: (field, value) => dispatch({ type: 'UPDATE_FORM_DATA', field, value }),
    resetForm: () => dispatch({ type: 'RESET_FORM' }),
    setFormData: (formData) => dispatch({ type: 'SET_FORM_DATA', formData }),

    addFlatRateEntry: () => dispatch({ type: 'ADD_FLAT_RATE_ENTRY' }),
    removeFlatRateEntry: (id) => dispatch({ type: 'REMOVE_FLAT_RATE_ENTRY', id }),
    updateFlatRateEntry: (id, field, value) => dispatch({ type: 'UPDATE_FLAT_RATE_ENTRY', id, field, value }),

    addHourlyRateEntry: () => dispatch({ type: 'ADD_HOURLY_RATE_ENTRY' }),
    removeHourlyRateEntry: (id) => dispatch({ type: 'REMOVE_HOURLY_RATE_ENTRY', id }),
    updateHourlyRateEntry: (id, field, value) => dispatch({ type: 'UPDATE_HOURLY_RATE_ENTRY', id, field, value }),

    addPricingProfileEntry: () => dispatch({ type: 'ADD_PRICING_PROFILE_ENTRY' }),
    removePricingProfileEntry: (id) => dispatch({ type: 'REMOVE_PRICING_PROFILE_ENTRY', id }),
    updatePricingProfileEntry: (id, field, value) => dispatch({ type: 'UPDATE_PRICING_PROFILE_ENTRY', id, field, value }),
    setDefaultPricingProfile: (id) => dispatch({ type: 'SET_DEFAULT_PRICING_PROFILE', id }),
    setPricingProfiles: (profiles) => dispatch({ type: 'SET_PRICING_PROFILES', profiles }),

    addMaterialEntry: () => dispatch({ type: 'ADD_MATERIAL_ENTRY' }),
    removeMaterialEntry: (id) => dispatch({ type: 'REMOVE_MATERIAL_ENTRY', id }),
    updateMaterialEntry: (id, field, value) => dispatch({ type: 'UPDATE_MATERIAL_ENTRY', id, field, value }),

    addTaskEntry: () => dispatch({ type: 'ADD_TASK_ENTRY' }),
    removeTaskEntry: (id) => dispatch({ type: 'REMOVE_TASK_ENTRY', id }),
    updateTaskEntry: (id, field, value) => dispatch({ type: 'UPDATE_TASK_ENTRY', id, field, value }),
  };

  return (
    <LaborCreationContext.Provider value={value}>
      {children}
    </LaborCreationContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useLaborCreation = () => {
  const context = useContext(LaborCreationContext);
  if (!context) throw new Error('useLaborCreation must be used within a LaborCreationProvider');
  return context;
};