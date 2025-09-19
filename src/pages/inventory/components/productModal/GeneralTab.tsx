import React, { useState, useEffect } from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';
import {
  getAllAvailableTrades,
  getProductSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes,
  getProductSizes,
  addProductTrade,
  addProductSection,
  addProductCategory,
  addProductSubcategory,
  addProductType,
  addProductSize,
  ProductSection,
  ProductCategory,
  ProductSubcategory,
  ProductType,
  ProductSize
} from '../../../../services/productCategories';
import { getBrands, addBrand } from '../../../../services/brands'; // NEW - Import brands service

const GeneralTab: React.FC = () => {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    updateField, 
    setHierarchySelection, 
    setLoadingState 
  } = useProductCreation();
  
  const { 
    formData, 
    selectedTradeId, 
    selectedSectionId, 
    selectedCategoryId, 
    selectedSubcategoryId,
    isLoadingTrades,
    isLoadingSections,
    isLoadingCategories,
    isLoadingSubcategories,
    isLoadingTypes,
    isLoadingSizes
  } = state;

  const [error, setError] = useState('');

  // State for hierarchical data
  const [trades, setTrades] = useState<string[]>([]);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  
  // NEW - State for brands
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);

  const loadTrades = async () => {
    if (!currentUser?.uid) return;
    
    setLoadingState('isLoadingTrades', true);
    try {
      const result = await getAllAvailableTrades(currentUser.uid);
      if (result.success && result.data) {
        setTrades(result.data);
      }
    } catch (error) {
      console.error('Error loading trades:', error);
      setError('Failed to load trades');
    } finally {
      setLoadingState('isLoadingTrades', false);
    }
  };

  const loadSections = async (tradeId: string) => {
    if (!currentUser?.uid) return;
    
    setLoadingState('isLoadingSections', true);
    try {
      const result = await getProductSections(tradeId, currentUser.uid);
      if (result.success && result.data) {
        setSections(result.data);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      setError('Failed to load sections');
    } finally {
      setLoadingState('isLoadingSections', false);
    }
  };

  const loadCategories = async (sectionId: string) => {
    if (!currentUser?.uid) return;
    
    setLoadingState('isLoadingCategories', true);
    try {
      const result = await getProductCategories(sectionId, currentUser.uid);
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoadingState('isLoadingCategories', false);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    if (!currentUser?.uid) return;
    
    setLoadingState('isLoadingSubcategories', true);
    try {
      const result = await getProductSubcategories(categoryId, currentUser.uid);
      if (result.success && result.data) {
        setSubcategories(result.data);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
      setError('Failed to load subcategories');
    } finally {
      setLoadingState('isLoadingSubcategories', false);
    }
  };

  const loadTypes = async (subcategoryId: string) => {
    if (!currentUser?.uid) return;
    
    setLoadingState('isLoadingTypes', true);
    try {
      const result = await getProductTypes(subcategoryId, currentUser.uid);
      if (result.success && result.data) {
        setTypes(result.data);
      }
    } catch (error) {
      console.error('Error loading types:', error);
      setError('Failed to load types');
    } finally {
      setLoadingState('isLoadingTypes', false);
    }
  };

  const loadSizes = async (tradeId: string) => {
    if (!currentUser?.uid) return;
    
    setLoadingState('isLoadingSizes', true);
    try {
      const result = await getProductSizes(tradeId, currentUser.uid);
      if (result.success && result.data) {
        setSizes(result.data);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
      setError('Failed to load sizes');
    } finally {
      setLoadingState('isLoadingSizes', false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (currentUser?.uid) {
      loadTrades();
      loadBrands(); // NEW - Load brands on mount
    }
  }, [currentUser?.uid]);

  // NEW - Load brands function
  const loadBrands = async () => {
    if (!currentUser?.uid) return;
    
    setIsLoadingBrands(true);
    try {
      const result = await getBrands(currentUser.uid);
      if (result.success && result.data) {
        const options = result.data.map(brand => ({
          value: brand.name,
          label: brand.name
        }));
        setBrands(options);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
      setError('Failed to load brands');
    } finally {
      setIsLoadingBrands(false);
    }
  };

  // Load sections when trade changes
  useEffect(() => {
    if (selectedTradeId && currentUser?.uid) {
      loadSections(selectedTradeId);
      loadSizes(selectedTradeId);
    } else {
      setSections([]);
      setCategories([]);
      setSubcategories([]);
      setTypes([]);
      setSizes([]);
    }
  }, [selectedTradeId, currentUser?.uid]); // Remove setLoadingState dependency

  // Load categories when section changes
  useEffect(() => {
    if (selectedSectionId && currentUser?.uid) {
      loadCategories(selectedSectionId);
    } else {
      setCategories([]);
      setSubcategories([]);
      setTypes([]);
    }
  }, [selectedSectionId, currentUser?.uid]); // Remove setLoadingState dependency

  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategoryId && currentUser?.uid) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
      setTypes([]);
    }
  }, [selectedCategoryId, currentUser?.uid]); // Remove setLoadingState dependency

  // Load types when subcategory changes
  useEffect(() => {
    if (selectedSubcategoryId && currentUser?.uid) {
      loadTypes(selectedSubcategoryId);
    } else {
      setTypes([]);
    }
  }, [selectedSubcategoryId, currentUser?.uid]); // Remove setLoadingState dependency

  // Handle trade change
  const handleTradeChange = (value: string) => {
    updateField('trade', value);
    setHierarchySelection('trade', value);
    
    // Clear downstream selections
    updateField('section', '');
    updateField('category', '');
    updateField('subcategory', '');
    updateField('type', '');
    updateField('size', '');
  };

  // Handle section change
  const handleSectionChange = (value: string) => {
    updateField('section', value);
    const section = sections.find(s => s.name === value);
    setHierarchySelection('section', section?.id || '');
    
    // Clear downstream selections
    updateField('category', '');
    updateField('subcategory', '');
    updateField('type', '');
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    updateField('category', value);
    const category = categories.find(c => c.name === value);
    setHierarchySelection('category', category?.id || '');
    
    // Clear downstream selections
    updateField('subcategory', '');
    updateField('type', '');
  };

  // Handle subcategory change
  const handleSubcategoryChange = (value: string) => {
    updateField('subcategory', value);
    const subcategory = subcategories.find(s => s.name === value);
    setHierarchySelection('subcategory', subcategory?.id || '');
    
    // Clear downstream selections
    updateField('type', '');
  };

  // NEW - Handle adding new brand
  const handleAddBrand = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addBrand(name, currentUser.uid);
    if (result.success) {
      await loadBrands();
    }
    return result;
  };

  // Add new handlers
  const handleAddTrade = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addProductTrade(name, currentUser.uid);
    if (result.success) {
      await loadTrades();
    }
    return result;
  };

  const handleAddSection = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!formData.trade) {
      return { success: false, error: 'Please select a trade first' };
    }

    const result = await addProductSection(name, formData.trade, currentUser.uid);
    if (result.success) {
      await loadSections(formData.trade);
    }
    return result;
  };

  const handleAddCategory = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!selectedSectionId) {
      return { success: false, error: 'Please select a section first' };
    }

    const result = await addProductCategory(name, selectedSectionId, currentUser.uid);
    if (result.success) {
      await loadCategories(selectedSectionId);
    }
    return result;
  };

  const handleAddSubcategory = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!selectedCategoryId) {
      return { success: false, error: 'Please select a category first' };
    }

    const result = await addProductSubcategory(name, selectedCategoryId, currentUser.uid);
    if (result.success) {
      await loadSubcategories(selectedCategoryId);
    }
    return result;
  };

  const handleAddType = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!selectedSubcategoryId) {
      return { success: false, error: 'Please select a subcategory first' };
    }

    const result = await addProductType(name, selectedSubcategoryId, currentUser.uid);
    if (result.success) {
      await loadTypes(selectedSubcategoryId);
    }
    return result;
  };

  const handleAddSize = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!formData.trade) {
      return { success: false, error: 'Please select a trade first' };
    }

    const result = await addProductSize(name, formData.trade, currentUser.uid);
    if (result.success) {
      await loadSizes(formData.trade);
    }
    return result;
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Product Name" required error={formData.errors.name}>
          <InputField
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter product name"
            required
            error={!!formData.errors.name}
          />
        </FormField>

        <FormField label="Brand" error={formData.errors.brand}>
          {isLoadingBrands ? (
            <InputField
              value="Loading brands..."
              disabled
              placeholder="Loading..."
            />
          ) : (
            <HierarchicalSelect
              value={formData.brand}
              onChange={(value) => updateField('brand', value)}
              options={brands}
              placeholder="Select or add brand"
              onAddNew={handleAddBrand}
            />
          )}
        </FormField>

        <FormField label="Trade" required error={formData.errors.trade}>
          <HierarchicalSelect
            value={formData.trade}
            onChange={handleTradeChange}
            options={trades.map(trade => ({ value: trade, label: trade }))}
            placeholder={isLoadingTrades ? "Loading trades..." : "Select or add trade"}
            onAddNew={handleAddTrade}
            disabled={isLoadingTrades}
            required
          />
        </FormField>

        <FormField label="Section">
          <HierarchicalSelect
            value={formData.section}
            onChange={handleSectionChange}
            options={sections.map(section => ({ value: section.name, label: section.name, id: section.id }))}
            placeholder={
              isLoadingSections ? "Loading sections..." :
              formData.trade ? "Select or add section" : "Select trade first"
            }
            onAddNew={handleAddSection}
            disabled={!formData.trade || isLoadingSections}
          />
        </FormField>

        <FormField label="Category">
          <HierarchicalSelect
            value={formData.category}
            onChange={handleCategoryChange}
            options={categories.map(category => ({ value: category.name, label: category.name, id: category.id }))}
            placeholder={
              isLoadingCategories ? "Loading categories..." :
              formData.section ? "Select or add category" : "Select section first"
            }
            onAddNew={handleAddCategory}
            disabled={!formData.section || isLoadingCategories}
          />
        </FormField>

        <FormField label="Subcategory">
          <HierarchicalSelect
            value={formData.subcategory}
            onChange={handleSubcategoryChange}
            options={subcategories.map(subcategory => ({ value: subcategory.name, label: subcategory.name, id: subcategory.id }))}
            placeholder={
              isLoadingSubcategories ? "Loading subcategories..." :
              formData.category ? "Select or add subcategory" : "Select category first"
            }
            onAddNew={handleAddSubcategory}
            disabled={!formData.category || isLoadingSubcategories}
          />
        </FormField>

        <FormField label="Type">
          <HierarchicalSelect
            value={formData.type}
            onChange={(value) => updateField('type', value)}
            options={types.map(type => ({ value: type.name, label: type.name, id: type.id }))}
            placeholder={
              isLoadingTypes ? "Loading types..." :
              formData.subcategory ? "Select or add type" : "Select subcategory first"
            }
            onAddNew={handleAddType}
            disabled={!formData.subcategory || isLoadingTypes}
          />
        </FormField>

        <FormField label="Size (Optional)">
          <HierarchicalSelect
            value={formData.size || ''}
            onChange={(value) => updateField('size', value)}
            options={sizes.map(size => ({ value: size.name, label: size.name, id: size.id }))}
            placeholder={
              isLoadingSizes ? "Loading sizes..." :
              formData.trade ? "Select or add size" : "Select trade first"
            }
            onAddNew={handleAddSize}
            disabled={!formData.trade || isLoadingSizes}
          />
        </FormField>
      </div>

      <FormField label="Description" error={formData.errors.description}>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Enter product description"
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
            formData.errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
        />
      </FormField>
    </div>
  );
};

export default GeneralTab;