// src/pages/labor/components/creationModal/GeneralTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLaborCreation } from '../../../../../contexts/LaborCreationContext';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../../mainComponents/forms/HierarchicalSelect';
import { getProductTrades, type ProductTrade } from '../../../../../services/categories/trades';
import { getSections, addSection, type LaborSection } from '../../../../../services/inventory/labor';
import { getCategories, addCategory, type LaborCategory } from '../../../../../services/inventory/labor';

interface GeneralTabProps {
  disabled?: boolean;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { state, updateFormData } = useLaborCreation();
  const { formData } = state;

  // Local state for hierarchy IDs
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Options state
  const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingUserAction, setIsLoadingUserAction] = useState(false);

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // Single initialization effect - loads everything at once
  useEffect(() => {
    if (!currentUser?.uid || initialLoadDone.current) return;

    const initializeAllData = async () => {
      setIsInitialLoading(true);
      
      try {
        // 1. Load all trades first
        const tradesResult = await getProductTrades(currentUser.uid);
        if (tradesResult.success && tradesResult.data) {
          const trades = tradesResult.data;
          setTradeOptions(trades.map(t => ({
            value: t.id!,
            label: t.name
          })));

          // 2. If editing (formData has tradeId), load sections and categories
          if (formData.tradeId) {
            setSelectedTradeId(formData.tradeId);
            
            // Load sections for this trade
            const sectionsResult = await getSections(formData.tradeId, currentUser.uid);
            if (sectionsResult.success && sectionsResult.data) {
              const sections = sectionsResult.data;
              setSectionOptions(sections.map(s => ({
                value: s.id!,
                label: s.name
              })));

              // 3. If we have a sectionId, load categories
              if (formData.sectionId) {
                setSelectedSectionId(formData.sectionId);
                
                const categoriesResult = await getCategories(formData.sectionId, currentUser.uid);
                if (categoriesResult.success && categoriesResult.data) {
                  setCategoryOptions(categoriesResult.data.map(c => ({
                    value: c.id!,
                    label: c.name
                  })));
                }
              }
            }
          }
        }

        initialLoadDone.current = true;
      } catch (error) {
        console.error('Error initializing labor data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initializeAllData();
  }, [currentUser?.uid, formData.tradeId, formData.sectionId]);

  // Handle trade change (user action)
  const handleTradeChange = async (value: string) => {
    const selectedTrade = tradeOptions.find(opt => opt.value === value);
    
    // Update form data with ID and name
    updateFormData('tradeId', value);
    updateFormData('tradeName', selectedTrade?.label || '');
    
    // Reset children
    updateFormData('sectionId', '');
    updateFormData('sectionName', '');
    updateFormData('categoryId', '');
    updateFormData('categoryName', '');
    
    // Update local state
    setSelectedTradeId(value);
    setSelectedSectionId('');
    
    // Clear downstream options
    setSectionOptions([]);
    setCategoryOptions([]);

    // Load sections for new trade
    if (value && currentUser?.uid) {
      setIsLoadingUserAction(true);
      try {
        const sectionsResult = await getSections(value, currentUser.uid);
        if (sectionsResult.success && sectionsResult.data) {
          setSectionOptions(sectionsResult.data.map(s => ({
            value: s.id!,
            label: s.name
          })));
        }
      } catch (error) {
        console.error('Error loading sections:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle section change (user action)
  const handleSectionChange = async (value: string) => {
    const selectedSection = sectionOptions.find(opt => opt.value === value);
    
    // Update form data with ID and name
    updateFormData('sectionId', value);
    updateFormData('sectionName', selectedSection?.label || '');
    
    // Reset children
    updateFormData('categoryId', '');
    updateFormData('categoryName', '');
    
    // Update local state
    setSelectedSectionId(value);
    
    // Clear downstream options
    setCategoryOptions([]);

    // Load categories for new section
    if (value && currentUser?.uid) {
      setIsLoadingUserAction(true);
      try {
        const categoriesResult = await getCategories(value, currentUser.uid);
        if (categoriesResult.success && categoriesResult.data) {
          setCategoryOptions(categoriesResult.data.map(c => ({
            value: c.id!,
            label: c.name
          })));
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle category change (user action)
  const handleCategoryChange = (value: string) => {
    const selectedCategory = categoryOptions.find(opt => opt.value === value);
    
    // Update form data with ID and name
    updateFormData('categoryId', value);
    updateFormData('categoryName', selectedCategory?.label || '');
  };

  // Add new section
  const handleAddSection = async (newName: string) => {
    if (!currentUser?.uid || !selectedTradeId) {
      return { success: false, error: 'Missing required data' };
    }

    const result = await addSection(newName, selectedTradeId, currentUser.uid);
    if (result.success) {
      // Reload sections
      const reloadResult = await getSections(selectedTradeId, currentUser.uid);
      if (reloadResult.success && reloadResult.data) {
        setSectionOptions(reloadResult.data.map(s => ({
          value: s.id!,
          label: s.name
        })));
      }
    }
    return result;
  };

  // Add new category
  const handleAddCategory = async (newName: string) => {
    if (!currentUser?.uid || !selectedSectionId || !selectedTradeId) {
      return { success: false, error: 'Missing required data' };
    }

    const result = await addCategory(newName, selectedSectionId, selectedTradeId, currentUser.uid);
    if (result.success) {
      // Reload categories
      const reloadResult = await getCategories(selectedSectionId, currentUser.uid);
      if (reloadResult.success && reloadResult.data) {
        setCategoryOptions(reloadResult.data.map(c => ({
          value: c.id!,
          label: c.name
        })));
      }
    }
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <FormField label="Labor Item Name" required>
            <InputField
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="e.g., Toilet Installation"
              disabled={disabled || isInitialLoading}
              required
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Brief description of this labor service..."
              rows={3}
              disabled={disabled || isInitialLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            />
          </FormField>
        </div>
      </div>

      {/* Hierarchical Categorization */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorization</h3>
        
        <div className="space-y-4">
          {/* Trade (Level 1) */}
          <FormField label="Trade" required>
            <HierarchicalSelect
              value={formData.tradeId}
              onChange={handleTradeChange}
              options={tradeOptions}
              placeholder={isInitialLoading ? "Loading trades..." : "Select trade"}
              disabled={disabled || isInitialLoading}
              required
            />
          </FormField>

          {/* Section (Level 2) */}
          <FormField label="Section" required>
            <HierarchicalSelect
              value={formData.sectionId}
              onChange={handleSectionChange}
              options={sectionOptions}
              placeholder={
                isInitialLoading
                  ? "Loading..."
                  : !selectedTradeId
                  ? "Select trade first"
                  : isLoadingUserAction
                  ? "Loading sections..."
                  : "Select section"
              }
              onAddNew={handleAddSection}
              disabled={disabled || !selectedTradeId || isLoadingUserAction || isInitialLoading}
              required
            />
          </FormField>

          {/* Category (Level 3) */}
          <FormField label="Category" required>
            <HierarchicalSelect
              value={formData.categoryId}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder={
                isInitialLoading
                  ? "Loading..."
                  : !selectedSectionId
                  ? "Select section first"
                  : isLoadingUserAction
                  ? "Loading categories..."
                  : "Select category"
              }
              onAddNew={handleAddCategory}
              disabled={disabled || !selectedSectionId || isLoadingUserAction || isInitialLoading}
              required
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;