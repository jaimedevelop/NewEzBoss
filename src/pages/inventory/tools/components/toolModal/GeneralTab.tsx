// src/pages/inventory/tools/components/toolModal/GeneralTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../../mainComponents/forms/HierarchicalSelect';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { useToolCreation } from '../../../../../contexts/ToolCreationContext';
import {
  getProductTrades,
  addProductTrade,
  type ProductTrade
} from '../../../../../services/categories/trades';
import {
  getToolSections,
  addToolSection
} from '../../../../../services/inventory/tools/sections';
import {
  getToolCategories,
  addToolCategory
} from '../../../../../services/inventory/tools/categories';
import {
  getToolSubcategories,
  addToolSubcategory
} from '../../../../../services/inventory/tools/subcategories';
import {
  getToolBrands,
  addToolBrand,
  type ToolBrand
} from '../../../../../services/inventory/tools/brands';
import {
  getLocations,
  addLocation,
  type Location
} from '../../../../../services/inventory/products/locations';

import { type ToolSection, ToolCategory, ToolSubcategory
} from '../../../../../services/inventory/tools/tool.types';

interface GeneralTabProps {
  disabled?: boolean;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { state, updateField } = useToolCreation();
  const { formData } = state;

  // State for hierarchical data
  const [trades, setTrades] = useState<ProductTrade[]>([]);
  const [sections, setSections] = useState<ToolSection[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ToolSubcategory[]>([]);
  const [brands, setBrands] = useState<ToolBrand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Local hierarchy selection state - Store the ACTUAL IDs
  const [localTradeId, setLocalTradeId] = useState<string>('');
  const [localSectionId, setLocalSectionId] = useState<string>('');
  const [localCategoryId, setLocalCategoryId] = useState<string>('');

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingUserAction, setIsLoadingUserAction] = useState(false);

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // Status options
  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'in-use', label: 'In Use' },
    { value: 'maintenance', label: 'Maintenance' }
  ];

  // Single initialization effect
  useEffect(() => {
    if (!currentUser?.uid || initialLoadDone.current) return;

    const isNewTool = !formData.id;
    
    if (!isNewTool) {
      const hasData = formData.name || formData.tradeId;
      if (!hasData) {
        return;
      }
    }

    const initializeAllData = async () => {
      setIsInitialLoading(true);
      
      try {
        // Load trades, brands, and locations
        const [tradesResult, brandsResult, locationsResult] = await Promise.all([
          getProductTrades(currentUser.uid),
          getToolBrands(currentUser.uid),
          getLocations(currentUser.uid)
        ]);

        if (tradesResult.success && tradesResult.data) {
          setTrades(tradesResult.data);
          
          // If editing, find the trade ID
          if (formData.tradeId) {
            setLocalTradeId(formData.tradeId);
            
            // Load sections for this trade
            const sectionsResult = await getToolSections(formData.tradeId, currentUser.uid);
            if (sectionsResult.success && sectionsResult.data) {
              setSections(sectionsResult.data);
              
              if (formData.sectionId) {
                setLocalSectionId(formData.sectionId);
                
                // Load categories for this section
                const categoriesResult = await getToolCategories(formData.sectionId, currentUser.uid);
                if (categoriesResult.success && categoriesResult.data) {
                  setCategories(categoriesResult.data);
                  
                  if (formData.categoryId) {
                    setLocalCategoryId(formData.categoryId);
                    
                    // Load subcategories for this category
                    const subcategoriesResult = await getToolSubcategories(formData.categoryId, currentUser.uid);
                    if (subcategoriesResult.success && subcategoriesResult.data) {
                      setSubcategories(subcategoriesResult.data);
                    }
                  }
                }
              }
            }
          }
        }

        if (brandsResult.success && brandsResult.data) {
          setBrands(brandsResult.data);
        }

        if (locationsResult.success && locationsResult.data) {
          setLocations(locationsResult.data);
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
        const sectionsResult = await getToolSections(tradeId, currentUser.uid);
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
        const categoriesResult = await getToolCategories(sectionId, currentUser.uid);
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
        const subcategoriesResult = await getToolSubcategories(categoryId, currentUser.uid);
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
  const handleAddBrand = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addToolBrand(name, currentUser.uid);
    if (result.success) {
      const brandsResult = await getToolBrands(currentUser.uid);
      if (brandsResult.success && brandsResult.data) {
        setBrands(brandsResult.data);
      }
    }
    return result;
  };

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

    const result = await addToolSection(name, localTradeId, currentUser.uid);
    if (result.success && localTradeId) {
      const sectionsResult = await getToolSections(localTradeId, currentUser.uid);
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

    const result = await addToolCategory(name, localSectionId, localTradeId, currentUser.uid);
    if (result.success && localSectionId) {
      const categoriesResult = await getToolCategories(localSectionId, currentUser.uid);
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

    const result = await addToolSubcategory(name, localCategoryId, localSectionId, localTradeId, currentUser.uid);
    if (result.success && localCategoryId) {
      const subcategoriesResult = await getToolSubcategories(localCategoryId, currentUser.uid);
      if (subcategoriesResult.success && subcategoriesResult.data) {
        setSubcategories(subcategoriesResult.data);
      }
    }
    return result;
  };

  const handleAddLocation = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addLocation(name, currentUser.uid);
    if (result.success) {
      const locationsResult = await getLocations(currentUser.uid);
      if (locationsResult.success && locationsResult.data) {
        setLocations(locationsResult.data);
      }
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Tool Name" required error={formData.errors.name}>
          <InputField
            value={formData.name}
            onChange={(e) => !disabled && updateField('name', e.target.value)}
            placeholder="Enter tool name"
            required
            error={!!formData.errors.name}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Brand" error={formData.errors.brand}>
          <HierarchicalSelect
            value={formData.brand}
            onChange={(value) => !disabled && updateField('brand', value)}
            options={brands.map(b => ({ value: b.name, label: b.name, id: b.id }))}
            placeholder={isInitialLoading ? "Loading..." : "Select or add brand"}
            onAddNew={!disabled ? handleAddBrand : undefined}
            disabled={disabled || isInitialLoading}
          />
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

        <FormField label="Location" error={formData.errors.location}>
          <HierarchicalSelect
            value={formData.location}
            onChange={(value) => !disabled && updateField('location', value)}
            options={locations.map(loc => ({ value: loc.name, label: loc.name, id: loc.id }))}
            placeholder={isInitialLoading ? "Loading..." : "Select or add location"}
            onAddNew={!disabled ? handleAddLocation : undefined}
            disabled={disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Purchase Date" error={formData.errors.purchaseDate}>
          <InputField
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => !disabled && updateField('purchaseDate', e.target.value)}
            error={!!formData.errors.purchaseDate}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Warranty Expiration" error={formData.errors.warrantyExpiration}>
          <InputField
            type="date"
            value={formData.warrantyExpiration}
            onChange={(e) => !disabled && updateField('warrantyExpiration', e.target.value)}
            error={!!formData.errors.warrantyExpiration}
            disabled={disabled}
          />
        </FormField>
      </div>

      <FormField label="Description" error={formData.errors.description}>
        <textarea
          value={formData.description}
          onChange={(e) => !disabled && updateField('description', e.target.value)}
          placeholder="Enter tool description"
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
          placeholder="Additional notes about this tool (maintenance history, special instructions, etc.)"
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