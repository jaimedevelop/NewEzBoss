import React, { useState, useEffect, useRef } from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';
import { hierarchyLoader } from '../../../../services/hierarchyLoader';
import {
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
import { addBrand } from '../../../../services/brands';

interface GeneralTabProps {
  disabled?: boolean;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ disabled = false }) => {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    updateField 
  } = useProductCreation();
  
  const { formData } = state;

  const [error, setError] = useState('');

  // State for hierarchical data
  const [trades, setTrades] = useState<string[]>([]);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  
  // State for brands
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);

  // Local hierarchy selection state
  const [localTradeId, setLocalTradeId] = useState<string>('');
  const [localSectionId, setLocalSectionId] = useState<string>('');
  const [localCategoryId, setLocalCategoryId] = useState<string>('');
  const [localSubcategoryId, setLocalSubcategoryId] = useState<string>('');

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingUserAction, setIsLoadingUserAction] = useState(false);

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // Single initialization effect using the HierarchyLoader
useEffect(() => {
  if (!currentUser?.uid || initialLoadDone.current) return;

  // Check if this is a new product or edit/view mode
  const isNewProduct = !formData.id;
  
  if (isNewProduct) {
    // For new products, load immediately
  } else {
    // For edit/view, wait until we have data
    const hasData = formData.name || formData.trade;
    if (!hasData) {
      return; // Wait for data to be populated
    }
  }

  const initializeAllData = async () => {
    setIsInitialLoading(true);
    
    try {
      // Load everything at once using the HierarchyLoader
      const result = await hierarchyLoader.loadCompleteHierarchy(
        {
          trade: formData.trade,
          section: formData.section,
          category: formData.category,
          subcategory: formData.subcategory,
          type: formData.type
        },
        currentUser.uid
      );

      // Set all the data at once
      setTrades(result.trades);
      setBrands(result.brands);
      setSections(result.sections);
      setCategories(result.categories);
      setSubcategories(result.subcategories);
      setTypes(result.types);
      setSizes(result.sizes);
      
      // Set local IDs
      setLocalTradeId(result.localIds.tradeId);
      setLocalSectionId(result.localIds.sectionId);
      setLocalCategoryId(result.localIds.categoryId);
      setLocalSubcategoryId(result.localIds.subcategoryId);

      initialLoadDone.current = true;
    } catch (error) {
      console.error('Error initializing data:', error);
      setError('Failed to load product categories');
    } finally {
      setIsInitialLoading(false);
    }
  };

  initializeAllData();
}, [currentUser?.uid, formData.id]); // Only depend on userId and id
  // Handle user-initiated trade change
  const handleTradeChange = async (value: string) => {
    if (disabled || !currentUser?.uid) return;
    
    updateField('trade', value);
    setLocalTradeId(value);
    
    // Clear downstream selections
    updateField('section', '');
    updateField('category', '');
    updateField('subcategory', '');
    updateField('type', '');
    updateField('size', '');
    setLocalSectionId('');
    setLocalCategoryId('');
    setLocalSubcategoryId('');
    
    // Clear downstream options immediately for better UX
    setCategories([]);
    setSubcategories([]);
    setTypes([]);
    setSizes([]);

    if (value) {
      setIsLoadingUserAction(true);
      try {
        // Load sections and sizes in parallel
        const [sectionsData, sizesData] = await Promise.all([
          hierarchyLoader.loadDependentData('sections', value, currentUser.uid),
          hierarchyLoader.loadDependentData('sizes', value, currentUser.uid)
        ]);
        
        setSections(sectionsData as ProductSection[]);
        setSizes(sizesData as ProductSize[]);
      } catch (error) {
        console.error('Error loading sections and sizes:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle user-initiated section change
  const handleSectionChange = async (value: string) => {
    if (disabled || !currentUser?.uid) return;
    
    updateField('section', value);
    const section = sections.find(s => s.name === value);
    setLocalSectionId(section?.id || '');
    
    // Clear downstream selections
    updateField('category', '');
    updateField('subcategory', '');
    updateField('type', '');
    setLocalCategoryId('');
    setLocalSubcategoryId('');
    
    // Clear downstream options
    setSubcategories([]);
    setTypes([]);

    if (section?.id) {
      setIsLoadingUserAction(true);
      try {
        const categoriesData = await hierarchyLoader.loadDependentData('categories', section.id, currentUser.uid);
        setCategories(categoriesData as ProductCategory[]);
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
    
    updateField('category', value);
    const category = categories.find(c => c.name === value);
    setLocalCategoryId(category?.id || '');
    
    // Clear downstream selections
    updateField('subcategory', '');
    updateField('type', '');
    setLocalSubcategoryId('');
    
    // Clear downstream options
    setTypes([]);

    if (category?.id) {
      setIsLoadingUserAction(true);
      try {
        const subcategoriesData = await hierarchyLoader.loadDependentData('subcategories', category.id, currentUser.uid);
        setSubcategories(subcategoriesData as ProductSubcategory[]);
      } catch (error) {
        console.error('Error loading subcategories:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle user-initiated subcategory change
  const handleSubcategoryChange = async (value: string) => {
    if (disabled || !currentUser?.uid) return;
    
    updateField('subcategory', value);
    const subcategory = subcategories.find(s => s.name === value);
    setLocalSubcategoryId(subcategory?.id || '');
    
    // Clear downstream selections
    updateField('type', '');

    if (subcategory?.id) {
      setIsLoadingUserAction(true);
      try {
        const typesData = await hierarchyLoader.loadDependentData('types', subcategory.id, currentUser.uid);
        setTypes(typesData as ProductType[]);
      } catch (error) {
        console.error('Error loading types:', error);
      } finally {
        setIsLoadingUserAction(false);
      }
    }
  };

  // Handle adding new items - these functions clear cache after adding
  const handleAddBrand = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addBrand(name, currentUser.uid);
    if (result.success) {
      hierarchyLoader.clearCache();
      const reloadResult = await hierarchyLoader.loadCompleteHierarchy({}, currentUser.uid);
      setBrands(reloadResult.brands);
    }
    return result;
  };

  const handleAddTrade = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addProductTrade(name, currentUser.uid);
    if (result.success) {
      hierarchyLoader.clearCache();
      const reloadResult = await hierarchyLoader.loadCompleteHierarchy({}, currentUser.uid);
      setTrades(reloadResult.trades);
    }
    return result;
  };

  const handleAddSection = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!formData.trade) {
      return { success: false, error: 'Please select a trade first' };
    }

    const result = await addProductSection(name, formData.trade, currentUser.uid);
    if (result.success && localTradeId) {
      hierarchyLoader.clearCacheForTrade(localTradeId);
      const sectionsData = await hierarchyLoader.loadDependentData('sections', localTradeId, currentUser.uid);
      setSections(sectionsData as ProductSection[]);
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

    const result = await addProductCategory(name, localSectionId, currentUser.uid);
    if (result.success && localSectionId) {
      const categoriesData = await hierarchyLoader.loadDependentData('categories', localSectionId, currentUser.uid);
      setCategories(categoriesData as ProductCategory[]);
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

    const result = await addProductSubcategory(name, localCategoryId, currentUser.uid);
    if (result.success && localCategoryId) {
      const subcategoriesData = await hierarchyLoader.loadDependentData('subcategories', localCategoryId, currentUser.uid);
      setSubcategories(subcategoriesData as ProductSubcategory[]);
    }
    return result;
  };

  const handleAddType = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!localSubcategoryId) {
      return { success: false, error: 'Please select a subcategory first' };
    }

    const result = await addProductType(name, localSubcategoryId, currentUser.uid);
    if (result.success && localSubcategoryId) {
      const typesData = await hierarchyLoader.loadDependentData('types', localSubcategoryId, currentUser.uid);
      setTypes(typesData as ProductType[]);
    }
    return result;
  };

  const handleAddSize = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!formData.trade) {
      return { success: false, error: 'Please select a trade first' };
    }

    const result = await addProductSize(name, formData.trade, currentUser.uid);
    if (result.success && localTradeId) {
      const sizesData = await hierarchyLoader.loadDependentData('sizes', localTradeId, currentUser.uid);
      setSizes(sizesData as ProductSize[]);
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
            onChange={(e) => !disabled && updateField('name', e.target.value)}
            placeholder="Enter product name"
            required
            error={!!formData.errors.name}
            disabled={disabled}
          />
        </FormField>

        <FormField label="Brand" error={formData.errors.brand}>
          <HierarchicalSelect
            value={formData.brand}
            onChange={(value) => !disabled && updateField('brand', value)}
            options={brands}
            placeholder={isInitialLoading ? "Loading..." : "Select or add brand"}
            onAddNew={!disabled ? handleAddBrand : undefined}
            disabled={disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Trade" required error={formData.errors.trade}>
          <HierarchicalSelect
            value={formData.trade}
            onChange={handleTradeChange}
            options={trades.map(trade => ({ value: trade, label: trade }))}
            placeholder={isInitialLoading ? "Loading..." : "Select or add trade"}
            onAddNew={!disabled ? handleAddTrade : undefined}
            disabled={disabled || isInitialLoading}
            required
          />
        </FormField>

        <FormField label="Section">
          <HierarchicalSelect
            value={formData.section}
            onChange={handleSectionChange}
            options={sections.map(section => ({ value: section.name, label: section.name, id: section.id }))}
            placeholder={
              isInitialLoading || isLoadingUserAction ? "Loading..." :
              formData.trade ? "Select or add section" : "Select trade first"
            }
            onAddNew={!disabled ? handleAddSection : undefined}
            disabled={!formData.trade || isLoadingUserAction || disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Category">
          <HierarchicalSelect
            value={formData.category}
            onChange={handleCategoryChange}
            options={categories.map(category => ({ value: category.name, label: category.name, id: category.id }))}
            placeholder={
              isInitialLoading || isLoadingUserAction ? "Loading..." :
              formData.section ? "Select or add category" : "Select section first"
            }
            onAddNew={!disabled ? handleAddCategory : undefined}
            disabled={!formData.section || isLoadingUserAction || disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Subcategory">
          <HierarchicalSelect
            value={formData.subcategory}
            onChange={handleSubcategoryChange}
            options={subcategories.map(subcategory => ({ value: subcategory.name, label: subcategory.name, id: subcategory.id }))}
            placeholder={
              isInitialLoading || isLoadingUserAction ? "Loading..." :
              formData.category ? "Select or add subcategory" : "Select category first"
            }
            onAddNew={!disabled ? handleAddSubcategory : undefined}
            disabled={!formData.category || isLoadingUserAction || disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Type">
          <HierarchicalSelect
            value={formData.type}
            onChange={(value) => !disabled && updateField('type', value)}
            options={types.map(type => ({ value: type.name, label: type.name, id: type.id }))}
            placeholder={
              isInitialLoading || isLoadingUserAction ? "Loading..." :
              formData.subcategory ? "Select or add type" : "Select subcategory first"
            }
            onAddNew={!disabled ? handleAddType : undefined}
            disabled={!formData.subcategory || isLoadingUserAction || disabled || isInitialLoading}
          />
        </FormField>

        <FormField label="Size (Optional)">
          <HierarchicalSelect
            value={formData.size || ''}
            onChange={(value) => !disabled && updateField('size', value)}
            options={sizes.map(size => ({ value: size.name, label: size.name, id: size.id }))}
            placeholder={
              isInitialLoading ? "Loading..." :
              formData.trade ? "Select or add size" : "Select trade first"
            }
            onAddNew={!disabled ? handleAddSize : undefined}
            disabled={!formData.trade || disabled || isInitialLoading}
          />
        </FormField>
      </div>

      <FormField label="Description" error={formData.errors.description}>
        <textarea
          value={formData.description}
          onChange={(e) => !disabled && updateField('description', e.target.value)}
          placeholder="Enter product description"
          rows={3}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 ${
            formData.errors.description ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        />
      </FormField>
    </div>
  );
};

export default GeneralTab;