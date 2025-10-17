// src/pages/labor/components/creationModal/GeneralTab.tsx
import React, { useState, useEffect } from 'react';
import { useLaborCreation } from '../../../../../contexts/LaborCreationContext';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../../mainComponents/forms/HierarchicalSelect';
import { getProductTrades, type ProductTrade } from '../../../../../services/categories/trades';
import { getLaborSections, addLaborSection, type LaborSection } from '../../../../../services/inventory/labor/sections';
import { getLaborCategories, addLaborCategory, type LaborCategory } from '../../../../../services/inventory/labor/categories';

interface GeneralTabProps {
  disabled?: boolean;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { state, updateFormData } = useLaborCreation();
  const { formData } = state;

  // Local state for hierarchy IDs
  const [selectedTradeId, setSelectedTradeId] = useState(formData.tradeId || '');
  const [selectedSectionId, setSelectedSectionId] = useState(formData.sectionId || '');

  // Options state
  const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Loading states
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Load trades on mount
  useEffect(() => {
    const loadTrades = async () => {
      if (!currentUser?.uid) return;

      setIsLoadingTrades(true);
      try {
        const result = await getProductTrades(currentUser.uid);
        if (result.success && result.data) {
          setTradeOptions(result.data.map(t => ({
            value: t.id!,
            label: t.name
          })));
        }
      } catch (error) {
        console.error('Error loading trades:', error);
      } finally {
        setIsLoadingTrades(false);
      }
    };

    loadTrades();
  }, [currentUser?.uid]);

  // Load sections when trade changes
  useEffect(() => {
    const loadSections = async () => {
      if (!selectedTradeId || !currentUser?.uid) {
        setSectionOptions([]);
        return;
      }

      setIsLoadingSections(true);
      try {
        const result = await getLaborSections(selectedTradeId, currentUser.uid);
        if (result.success && result.data) {
          setSectionOptions(result.data.map(s => ({
            value: s.id!,
            label: s.name
          })));
        }
      } catch (error) {
        console.error('Error loading sections:', error);
      } finally {
        setIsLoadingSections(false);
      }
    };

    loadSections();
  }, [selectedTradeId, currentUser?.uid]);

  // Load categories when section changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!selectedSectionId || !currentUser?.uid) {
        setCategoryOptions([]);
        return;
      }

      setIsLoadingCategories(true);
      try {
        const result = await getLaborCategories(selectedSectionId, currentUser.uid);
        if (result.success && result.data) {
          setCategoryOptions(result.data.map(c => ({
            value: c.id!,
            label: c.name
          })));
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [selectedSectionId, currentUser?.uid]);

  // Handle trade change
  const handleTradeChange = (value: string) => {
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
  };

  // Handle section change
  const handleSectionChange = (value: string) => {
    const selectedSection = sectionOptions.find(opt => opt.value === value);
    
    // Update form data with ID and name
    updateFormData('sectionId', value);
    updateFormData('sectionName', selectedSection?.label || '');
    
    // Reset children
    updateFormData('categoryId', '');
    updateFormData('categoryName', '');
    
    // Update local state
    setSelectedSectionId(value);
  };

  // Handle category change
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

    const result = await addLaborSection(newName, selectedTradeId, currentUser.uid);
    if (result.success) {
      // Reload sections
      const reloadResult = await getLaborSections(selectedTradeId, currentUser.uid);
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

    const result = await addLaborCategory(newName, selectedSectionId, selectedTradeId, currentUser.uid);
    if (result.success) {
      // Reload categories
      const reloadResult = await getLaborCategories(selectedSectionId, currentUser.uid);
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
              disabled={disabled}
              required
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Brief description of this labor service..."
              rows={3}
              disabled={disabled}
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
              placeholder={isLoadingTrades ? "Loading trades..." : "Select trade"}
              disabled={disabled || isLoadingTrades}
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
                !selectedTradeId
                  ? "Select trade first"
                  : isLoadingSections
                  ? "Loading sections..."
                  : "Select section"
              }
              onAddNew={handleAddSection}
              disabled={disabled || !selectedTradeId || isLoadingSections}
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
                !selectedSectionId
                  ? "Select section first"
                  : isLoadingCategories
                  ? "Loading categories..."
                  : "Select category"
              }
              onAddNew={handleAddCategory}
              disabled={disabled || !selectedSectionId || isLoadingCategories}
              required
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;