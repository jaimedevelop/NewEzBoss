import React, { useState, useEffect, useRef } from 'react';
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
import { getBrands, addBrand } from '../../../../services/brands';

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

  // Local hierarchy selection state (to avoid context updates in effects)
  const [localTradeId, setLocalTradeId] = useState<string>('');
  const [localSectionId, setLocalSectionId] = useState<string>('');
  const [localCategoryId, setLocalCategoryId] = useState<string>('');
  const [localSubcategoryId, setLocalSubcategoryId] = useState<string>('');

  // Local loading states
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);

  // Track if initial loads have been done
  const initialLoadDone = useRef(false);
  const hierarchyInitialized = useRef(false);
  
  // Track previous hierarchy values to prevent unnecessary reloads
  const prevTradeRef = useRef<string>('');
  const prevSectionRef = useRef<string>('');
  const prevCategoryRef = useRef<string>('');
  const prevSubcategoryRef = useRef<string>('');

  // Load functions
  const loadTrades = async () => {
    if (!currentUser?.uid) return;
    
    setIsLoadingTrades(true);
    try {
      const result = await getAllAvailableTrades(currentUser.uid);
      if (result.success && result.data) {
        setTrades(result.data);
      }
    } catch (error) {
      console.error('Error loading trades:', error);
      setError('Failed to load trades');
    } finally {
      setIsLoadingTrades(false);
    }
  };

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

  // Initialize hierarchy for editing products
  useEffect(() => {
    if (!formData.id || !currentUser?.uid || hierarchyInitialized.current) return;
    
    const initializeHierarchy = async () => {
      if (formData.trade) {
        setLocalTradeId(formData.trade);
        prevTradeRef.current = formData.trade;
        
        const sectionsResult = await getProductSections(formData.trade, currentUser.uid);
        if (sectionsResult.success && sectionsResult.data) {
          setSections(sectionsResult.data);
          
          const section = sectionsResult.data.find(s => s.name === formData.section);
          if (section) {
            setLocalSectionId(section.id!);
            prevSectionRef.current = formData.section;
            
            const categoriesResult = await getProductCategories(section.id!, currentUser.uid);
            if (categoriesResult.success && categoriesResult.data) {
              setCategories(categoriesResult.data);
              
              const category = categoriesResult.data.find(c => c.name === formData.category);
              if (category) {
                setLocalCategoryId(category.id!);
                prevCategoryRef.current = formData.category;
                
                const subcategoriesResult = await getProductSubcategories(category.id!, currentUser.uid);
                if (subcategoriesResult.success && subcategoriesResult.data) {
                  setSubcategories(subcategoriesResult.data);
                  
                  const subcategory = subcategoriesResult.data.find(sc => sc.name === formData.subcategory);
                  if (subcategory) {
                    setLocalSubcategoryId(subcategory.id!);
                    prevSubcategoryRef.current = formData.subcategory;
                    
                    const typesResult = await getProductTypes(subcategory.id!, currentUser.uid);
                    if (typesResult.success && typesResult.data) {
                      setTypes(typesResult.data);
                    }
                  }
                }
              }
            }
          }
        }
        
        const sizesResult = await getProductSizes(formData.trade, currentUser.uid);
        if (sizesResult.success && sizesResult.data) {
          setSizes(sizesResult.data);
        }
      }
      hierarchyInitialized.current = true;
    };
    
    initializeHierarchy();
  }, [formData.id, currentUser?.uid]);

  // Load initial data
  useEffect(() => {
    if (currentUser?.uid && !initialLoadDone.current) {
      loadTrades();
      loadBrands();
      initialLoadDone.current = true;
    }
  }, [currentUser?.uid]);

  // Load sections when trade changes
  useEffect(() => {
    if (localTradeId && currentUser?.uid) {
      const loadSections = async () => {
        setIsLoadingSections(true);
        try {
          const result = await getProductSections(localTradeId, currentUser.uid);
          if (result.success && result.data) {
            setSections(result.data);
          }
        } catch (error) {
          console.error('Error loading sections:', error);
        } finally {
          setIsLoadingSections(false);
        }
      };
      
      const loadSizes = async () => {
        setIsLoadingSizes(true);
        try {
          const result = await getProductSizes(localTradeId, currentUser.uid);
          if (result.success && result.data) {
            setSizes(result.data);
          }
        } catch (error) {
          console.error('Error loading sizes:', error);
        } finally {
          setIsLoadingSizes(false);
        }
      };

      loadSections();
      loadSizes();
    } else {
      setSections([]);
      setCategories([]);
      setSubcategories([]);
      setTypes([]);
      setSizes([]);
    }
  }, [localTradeId, currentUser?.uid]);

  // Load categories when section changes
  useEffect(() => {
    if (localSectionId && currentUser?.uid) {
      const loadCategories = async () => {
        setIsLoadingCategories(true);
        try {
          const result = await getProductCategories(localSectionId, currentUser.uid);
          if (result.success && result.data) {
            setCategories(result.data);
          }
        } catch (error) {
          console.error('Error loading categories:', error);
        } finally {
          setIsLoadingCategories(false);
        }
      };
      
      loadCategories();
    } else {
      setCategories([]);
      setSubcategories([]);
      setTypes([]);
    }
  }, [localSectionId, currentUser?.uid]);

  // Load subcategories when category changes
  useEffect(() => {
    if (localCategoryId && currentUser?.uid) {
      const loadSubcategories = async () => {
        setIsLoadingSubcategories(true);
        try {
          const result = await getProductSubcategories(localCategoryId, currentUser.uid);
          if (result.success && result.data) {
            setSubcategories(result.data);
          }
        } catch (error) {
          console.error('Error loading subcategories:', error);
        } finally {
          setIsLoadingSubcategories(false);
        }
      };
      
      loadSubcategories();
    } else {
      setSubcategories([]);
      setTypes([]);
    }
  }, [localCategoryId, currentUser?.uid]);

  // Load types when subcategory changes
  useEffect(() => {
    if (localSubcategoryId && currentUser?.uid) {
      const loadTypes = async () => {
        setIsLoadingTypes(true);
        try {
          const result = await getProductTypes(localSubcategoryId, currentUser.uid);
          if (result.success && result.data) {
            setTypes(result.data);
          }
        } catch (error) {
          console.error('Error loading types:', error);
        } finally {
          setIsLoadingTypes(false);
        }
      };
      
      loadTypes();
    } else {
      setTypes([]);
    }
  }, [localSubcategoryId, currentUser?.uid]);

  // Handle trade change
  const handleTradeChange = (value: string) => {
    if (disabled) return;
    
    // Only update if the value actually changed
    if (value === prevTradeRef.current) return;
    
    updateField('trade', value);
    setLocalTradeId(value);
    prevTradeRef.current = value;
    
    // Clear downstream selections
    updateField('section', '');
    updateField('category', '');
    updateField('subcategory', '');
    updateField('type', '');
    updateField('size', '');
    setLocalSectionId('');
    setLocalCategoryId('');
    setLocalSubcategoryId('');
    prevSectionRef.current = '';
    prevCategoryRef.current = '';
    prevSubcategoryRef.current = '';
  };

  // Handle section change
  const handleSectionChange = (value: string) => {
    if (disabled) return;
    
    // Only update if the value actually changed
    if (value === prevSectionRef.current) return;
    
    updateField('section', value);
    const section = sections.find(s => s.name === value);
    setLocalSectionId(section?.id || '');
    prevSectionRef.current = value;
    
    // Clear downstream selections
    updateField('category', '');
    updateField('subcategory', '');
    updateField('type', '');
    setLocalCategoryId('');
    setLocalSubcategoryId('');
    prevCategoryRef.current = '';
    prevSubcategoryRef.current = '';
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    if (disabled) return;
    
    // Only update if the value actually changed
    if (value === prevCategoryRef.current) return;
    
    updateField('category', value);
    const category = categories.find(c => c.name === value);
    setLocalCategoryId(category?.id || '');
    prevCategoryRef.current = value;
    
    // Clear downstream selections
    updateField('subcategory', '');
    updateField('type', '');
    setLocalSubcategoryId('');
    prevSubcategoryRef.current = '';
  };

  // Handle subcategory change
  const handleSubcategoryChange = (value: string) => {
    if (disabled) return;
    
    // Only update if the value actually changed
    if (value === prevSubcategoryRef.current) return;
    
    updateField('subcategory', value);
    const subcategory = subcategories.find(s => s.name === value);
    setLocalSubcategoryId(subcategory?.id || '');
    prevSubcategoryRef.current = value;
    
    // Clear downstream selections
    updateField('type', '');
  };

  // Handle adding new items
  const handleAddBrand = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addBrand(name, currentUser.uid);
    if (result.success) {
      await loadBrands();
    }
    return result;
  };

  const handleAddTrade = async (name: string) => {
    if (!currentUser?.uid || disabled) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addProductTrade(name, currentUser.uid);
    if (result.success) {
      await loadTrades();
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
      // Reload sections
      const sectionsResult = await getProductSections(localTradeId, currentUser.uid);
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

    const result = await addProductCategory(name, localSectionId, currentUser.uid);
    if (result.success && localSectionId) {
      // Reload categories
      const categoriesResult = await getProductCategories(localSectionId, currentUser.uid);
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

    const result = await addProductSubcategory(name, localCategoryId, currentUser.uid);
    if (result.success && localCategoryId) {
      // Reload subcategories
      const subcategoriesResult = await getProductSubcategories(localCategoryId, currentUser.uid);
      if (subcategoriesResult.success && subcategoriesResult.data) {
        setSubcategories(subcategoriesResult.data);
      }
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
      // Reload types
      const typesResult = await getProductTypes(localSubcategoryId, currentUser.uid);
      if (typesResult.success && typesResult.data) {
        setTypes(typesResult.data);
      }
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
      // Reload sizes
      const sizesResult = await getProductSizes(localTradeId, currentUser.uid);
      if (sizesResult.success && sizesResult.data) {
        setSizes(sizesResult.data);
      }
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
          {isLoadingBrands ? (
            <InputField
              value="Loading brands..."
              disabled
              placeholder="Loading..."
            />
          ) : (
            <HierarchicalSelect
              value={formData.brand}
              onChange={(value) => !disabled && updateField('brand', value)}
              options={brands}
              placeholder="Select or add brand"
              onAddNew={!disabled ? handleAddBrand : undefined}
              disabled={disabled}
            />
          )}
        </FormField>

        <FormField label="Trade" required error={formData.errors.trade}>
          <HierarchicalSelect
            value={formData.trade}
            onChange={handleTradeChange}
            options={trades.map(trade => ({ value: trade, label: trade }))}
            placeholder={isLoadingTrades ? "Loading trades..." : "Select or add trade"}
            onAddNew={!disabled ? handleAddTrade : undefined}
            disabled={isLoadingTrades || disabled}
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
            onAddNew={!disabled ? handleAddSection : undefined}
            disabled={!formData.trade || isLoadingSections || disabled}
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
            onAddNew={!disabled ? handleAddCategory : undefined}
            disabled={!formData.section || isLoadingCategories || disabled}
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
            onAddNew={!disabled ? handleAddSubcategory : undefined}
            disabled={!formData.category || isLoadingSubcategories || disabled}
          />
        </FormField>

        <FormField label="Type">
          <HierarchicalSelect
            value={formData.type}
            onChange={(value) => !disabled && updateField('type', value)}
            options={types.map(type => ({ value: type.name, label: type.name, id: type.id }))}
            placeholder={
              isLoadingTypes ? "Loading types..." :
              formData.subcategory ? "Select or add type" : "Select subcategory first"
            }
            onAddNew={!disabled ? handleAddType : undefined}
            disabled={!formData.subcategory || isLoadingTypes || disabled}
          />
        </FormField>

        <FormField label="Size (Optional)">
          <HierarchicalSelect
            value={formData.size || ''}
            onChange={(value) => !disabled && updateField('size', value)}
            options={sizes.map(size => ({ value: size.name, label: size.name, id: size.id }))}
            placeholder={
              isLoadingSizes ? "Loading sizes..." :
              formData.trade ? "Select or add size" : "Select trade first"
            }
            onAddNew={!disabled ? handleAddSize : undefined}
            disabled={!formData.trade || isLoadingSizes || disabled}
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