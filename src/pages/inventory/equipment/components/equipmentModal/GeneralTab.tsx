// src/pages/inventory/equipment/components/equipmentModal/GeneralTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../../mainComponents/forms/HierarchicalSelect';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { useEquipmentCreation } from '../../../../../contexts/EquipmentCreationContext';
import {
  getProductTrades,
  addProductTrade,
  type ProductTrade
} from '../../../../../services/categories/trades';
import {
  getEquipmentSections,
  addEquipmentSection
} from '../../../../../services/inventory/equipment/sections';
import {
  getEquipmentCategories,
  addEquipmentCategory
} from '../../../../../services/inventory/equipment/categories';
import {
  getEquipmentSubcategories,
  addEquipmentSubcategory
} from '../../../../../services/inventory/equipment/subcategories';

import {
  type EquipmentSection,
  EquipmentCategory,
  EquipmentSubcategory
} from '../../../../../services/inventory/equipment/equipment.types';

interface GeneralTabProps {
  disabled?: boolean;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { state, updateField } = useEquipmentCreation();
  const { formData } = state;

  // State for hierarchical data
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [sections, setSections] = useState<EquipmentSection[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [subcategories, setSubcategories] = useState<EquipmentSubcategory[]>([]);

  // Local hierarchy selection state - Store the ACTUAL IDs
  const [localTradeId, setLocalTradeId] = useState<string>('');
  const [localSectionId, setLocalSectionId] = useState<string>('');
  const [localCategoryId, setLocalCategoryId] = useState<string>('');

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingUserAction, setIsLoadingUserAction] = useState(false);

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // Equipment type options
  const equipmentTypeOptions = [
    { value: 'owned', label: 'Owned Equipment' },
    { value: 'rented', label: 'Rented Equipment' }
  ];

  // Status options
  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'in-use', label: 'In Use' },
    { value: 'maintenance', label: 'Maintenance' }
  ];

  // Single initialization effect
  useEffect(() => {
    if (!currentUser?.uid || initialLoadDone.current) return;

    const isNewEquipment = !formData.id;
    
    if (!isNewEquipment) {
      const hasData = formData.name || formData.tradeId;
      if (!hasData) {
        return;
      }
    }

    const initializeAllData = async () => {
      setIsInitialLoading(true);
      
      try {
        // Load trades
        const tradesResult = await getProductTrades(currentUser.uid);

        if (tradesResult.success && tradesResult.data) {
          setTrades(tradesResult.data);
          
          // If editing, find the trade ID
          if (formData.tradeId) {
            setLocalTradeId(formData.tradeId);
            
            // Load sections for this trade
            const sectionsResult = await getEquipmentSections(formData.tradeId, currentUser.uid);
            if (sectionsResult.success && sectionsResult.data) {
              setSections(sectionsResult.data);
              
              if (formData.sectionId) {
                setLocalSectionId(formData.sectionId);
                
                // Load categories for this section
                const categoriesResult = await getEquipmentCategories(formData.sectionId, currentUser.uid);
                if (categoriesResult.success && categoriesResult.data) {
                  setCategories(categoriesResult.data);
                  
                  if (formData.categoryId) {
                    setLocalCategoryId(formData.categoryId);
                    
                    // Load subcategories for this category
                    const subcategoriesResult = await getEquipmentSubcategories(formData.categoryId, currentUser.uid);
                    if (subcategoriesResult.success && subcategoriesResult.data) {
                      setSubcategories(subcategoriesResult.data);
                    }
                  }
                }
              }
            }
          }
        }

        initialLoadDone.current = true;
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeAllData();
  }, [currentUser?.uid, formData.id]);

  // Handle user-initiated trade change
  const handleTradeChange = async (value: string) => {
    if (disabled || !currentUser?.uid) return;
    
    // Find the trade by name to get its ID
    const selectedTrade = trades.find(t => t.name === value);
    const tradeId = selectedTrade?.id || '';
    
    updateField('tradeName', value);
    updateField('tradeId', tradeId);
    setLocalTradeId(tradeId);
    
    // Clear downstream selections
    updateField('sectionName', '');
    updateField('sectionId', '');
    updateField('categoryName', '');
    updateField('categoryId', '');
    updateField('subcategoryName', '');
    updateField('subcategoryId', '');
    setLocalSectionId('');
    setLocalCategoryId('');
    
    // Clear downstream options
    setCategories([]);
    setSubcategories([]);

    if (tradeId) {
      setIsLoadingUserAction(true);
      try {
        const sectionsResult = await getEquipmentSections(tradeId, currentUser.uid);
        if (sectionsResult.success && sectionsResult.data) {
          setSections(sectionsResult.data);
        }
      } catch (error) {
        console.error('Error loading sections:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle user-initiated section change
  const handleSectionChange = async (value: string) => {
    if (disabled || !currentUser?.uid) return;
    
    const section = sections.find(s => s.name === value);
    const sectionId = section?.id || '';
    
    updateField('sectionName', value);
    updateField('sectionId', sectionId);
    setLocalSectionId(sectionId);
    
    // Clear downstream selections
    updateField('categoryName', '');
    updateField('categoryId', '');
    updateField('subcategoryName', '');
    updateField('subcategoryId', '');
    setLocalCategoryId('');
    
    // Clear downstream options
    setSubcategories([]);

    if (sectionId) {
      setIsLoadingUserAction(true);
      try {
        const categoriesResult = await getEquipmentCategories(sectionId, currentUser.uid);
        if (categoriesResult.success && categoriesResult.data) {
          setCategories(categoriesResult.data);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle user-initiated category change
  const handleCategoryChange = async (value: string) => {
    if (disabled || !currentUser?.uid) return;
    
    const category = categories.find(c => c.name === value);
    const categoryId = category?.id || '';
    
    updateField('categoryName', value);
    updateField('categoryId', categoryId);
    setLocalCategoryId(categoryId);
    
    // Clear downstream selections
    updateField('subcategoryName', '');
    updateField('subcategoryId', '');

    if (categoryId) {
      setIsLoadingUserAction(true);
      try {
        const subcategoriesResult = await getEquipmentSubcategories(categoryId, currentUser.uid);
        if (subcategoriesResult.success && subcategoriesResult.data) {
          setSubcategories(subcategoriesResult.data);
        }
      } catch (error) {
        console.error('Error loading subcategories:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle user-initiated subcategory change
  const handleSubcategoryChange = (value: string) => {
    if (disabled) return;
    
    const subcategory = subcategories.find(s => s.name === value);
    const subcategoryId = subcategory?.id || '';
    
    updateField('subcategoryName', value);
    updateField('subcategoryId', subcategoryId);
  };

  // Handle adding new items
  const handleAddTrade = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addProductTrade(name, currentUser.uid);
    if (result.success) {
      const tradesResult = await getProductTrades(currentUser.uid);
      if (tradesResult.success && tradesResult.data) {
        setTrades(tradesResult.data);
      }
    }
    return result;
  };

  const handleAddSection = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!localTradeId) {
      return { success: false, error: 'Please select a trade first' };
    }

    const result = await addEquipmentSection(name, localTradeId, currentUser.uid);
    if (result.success && localTradeId) {
      const sectionsResult = await getEquipmentSections(localTradeId, currentUser.uid);
      if (sectionsResult.success && sectionsResult.data) {
        setSections(sectionsResult.data);
      }
    }
    return result;
  };

  const handleAddCategory = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!localSectionId) {
      return { success: false, error: 'Please select a section first' };
    }

    const result = await addEquipmentCategory(name, localSectionId, localTradeId, currentUser.uid);
    if (result.success && localSectionId) {
      const categoriesResult = await getEquipmentCategories(localSectionId, currentUser.uid);
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
    }
    return result;
  };

  const handleAddSubcategory = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!localCategoryId) {
      return { success: false, error: 'Please select a category first' };
    }

    const result = await addEquipmentSubcategory(name, localCategoryId, localSectionId, localTradeId, currentUser.uid);
    if (result.success && localCategoryId) {
      const subcategoriesResult = await getEquipmentSubcategories(localCategoryId, currentUser.uid);
      if (subcategoriesResult.success && subcategoriesResult.data) {
        setSubcategories(subcategoriesResult.data);
      }
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Equipment Name" required error={formData.errors.name}>
          <InputField
            value={formData.name}
            onChange={(e) => !disabled && updateField('name', e.target.value)}
            placeholder="Enter equipment name"
            required
            error={!!formData.errors.name}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Equipment Type" required error={formData.errors.equipmentType}>
          <select
            value={formData.equipmentType}
            onChange={(e) => !disabled && updateField('equipmentType', e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              formData.errors.equipmentType ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select equipment type</option>
            {equipmentTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Trade" required error={formData.errors.tradeId}>
          <HierarchicalSelect
            value={formData.tradeName}
            onChange={handleTradeChange}
            options={trades.map(trade => ({ value: trade.name, label: trade.name, id: trade.id }))}
            placeholder={isInitialLoading ? "Loading..." : "Select or add trade"}
            onAddNew={!disabled ? handleAddTrade : undefined}
            disabled={disabled || isInitialLoading}
            required
          />
        </FormField>

        <FormField label="Section">
          <HierarchicalSelect
            value={formData.sectionName}
            onChange={handleSectionChange}
            options={sections.map(section => ({ value: section.name, label: section.name, id: section.id }))}
            placeholder={
              isInitialLoading || isLoadingUserAction ? "Loading..." :
              formData.tradeName ? "Select or add section" : "Select trade first"
            }
            onAddNew={!disabled ? handleAddSection : undefined}
            disabled={!formData.tradeName || isLoadingUserAction || disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Category">
          <HierarchicalSelect
            value={formData.categoryName}
            onChange={handleCategoryChange}
            options={categories.map(category => ({ value: category.name, label: category.name, id: category.id }))}
            placeholder={
              isInitialLoading || isLoadingUserAction ? "Loading..." :
              formData.sectionName ? "Select or add category" : "Select section first"
            }
            onAddNew={!disabled ? handleAddCategory : undefined}
            disabled={!formData.sectionName || isLoadingUserAction || disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Subcategory">
          <HierarchicalSelect
            value={formData.subcategoryName}
            onChange={handleSubcategoryChange}
            options={subcategories.map(subcategory => ({ value: subcategory.name, label: subcategory.name, id: subcategory.id }))}
            placeholder={
              isInitialLoading || isLoadingUserAction ? "Loading..." :
              formData.categoryName ? "Select or add subcategory" : "Select category first"
            }
            onAddNew={!disabled ? handleAddSubcategory : undefined}
            disabled={!formData.categoryName || isLoadingUserAction || disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Status" required error={formData.errors.status}>
          <select
            value={formData.status}
            onChange={(e) => !disabled && updateField('status', e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              formData.errors.status ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select status</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Description" error={formData.errors.description}>
        <textarea
          value={formData.description}
          onChange={(e) => !disabled && updateField('description', e.target.value)}
          placeholder="Enter equipment description"
          rows={3}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            formData.errors.description ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        />
      </FormField>

      <FormField label="Notes" error={formData.errors.notes}>
        <textarea
          value={formData.notes}
          onChange={(e) => !disabled && updateField('notes', e.target.value)}
          placeholder="Additional notes about this equipment (maintenance history, special instructions, etc.)"
          rows={3}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            formData.errors.notes ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        />
      </FormField>
    </div>
  );
};

export default GeneralTab;