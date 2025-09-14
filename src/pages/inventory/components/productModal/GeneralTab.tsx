import React, { useState, useEffect } from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../mainComponents/forms/SelectField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
  getAllAvailableSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes,
  addProductSection,
  addProductCategory,
  addProductSubcategory,
  addProductType,
  getAllAvailableProductTypes,
  addStandaloneProductType,
  ProductCategory,
  ProductSubcategory,
  ProductType
} from '../../../../services/productCategories';

interface ProductData {
  id?: string;
  name: string;
  sku: string;
  section: string;
  category: string;
  subcategory: string;
  type: 'Material' | 'Tool' | 'Equipment' | 'Rental' | 'Consumable' | 'Safety';
  size?: string;
  description: string;
  unitPrice: number;
  unit: string;
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  location: string;
  lastUpdated: string;
  skus?: any[];
  barcode?: string;
}

interface GeneralTabProps {
  formData: ProductData;
  onInputChange: (field: keyof ProductData, value: any) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ formData, onInputChange }) => {
  const { currentUser } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State for hierarchical data
  const [sections, setSections] = useState<string[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);

  // State for selected IDs to track hierarchy
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  // State for standalone product types
  const [productTypes, setProductTypes] = useState<string[]>([]);

  // Size options remain the same
  const [sizeOptions, setSizeOptions] = React.useState<string[]>([
    '1/2"', '3/4"', '1"', '1.5"', '2"', '3"', '4"', '6"',
    '2x4', '2x6', '2x8', '2x10', '2x12',
    '4x8', '4x10', '4x12',
  ]);

  // Load initial data
  useEffect(() => {
    if (currentUser?.uid) {
      loadSections();
      loadProductTypes();
    }
  }, [currentUser]);

  // Load categories when section changes
  useEffect(() => {
    if (selectedSectionId && currentUser?.uid) {
      loadCategories(selectedSectionId);
    } else {
      setCategories([]);
      setSubcategories([]);
      setTypes([]);
    }
  }, [selectedSectionId, currentUser]);

  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategoryId && currentUser?.uid) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
      setTypes([]);
    }
  }, [selectedCategoryId, currentUser]);

  // Load types when subcategory changes
  useEffect(() => {
    if (selectedSubcategoryId && currentUser?.uid) {
      loadTypes(selectedSubcategoryId);
    } else {
      setTypes([]);
    }
  }, [selectedSubcategoryId, currentUser]);

  const loadSections = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getAllAvailableSections(currentUser.uid);
      if (result.success && result.data) {
        setSections(result.data);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const loadProductTypes = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getAllAvailableProductTypes(currentUser.uid);
      if (result.success && result.data) {
        setProductTypes(result.data);
      }
    } catch (error) {
      console.error('Error loading product types:', error);
    }
  };

  const loadCategories = async (sectionName: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getProductCategories(sectionName, currentUser.uid);
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getProductSubcategories(categoryId, currentUser.uid);
      if (result.success && result.data) {
        setSubcategories(result.data);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const loadTypes = async (subcategoryId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getProductTypes(subcategoryId, currentUser.uid);
      if (result.success && result.data) {
        setTypes(result.data);
      }
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  // Handle section change
  const handleSectionChange = (value: string) => {
    onInputChange('section', value);
    setSelectedSectionId(value); // For custom sections, we'll use name as ID
    
    // Clear downstream selections
    onInputChange('category', '');
    onInputChange('subcategory', '');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    onInputChange('category', value);
    const category = categories.find(c => c.name === value);
    setSelectedCategoryId(category?.id || '');
    
    // Clear downstream selections
    onInputChange('subcategory', '');
    setSelectedSubcategoryId('');
  };

  // Handle subcategory change
  const handleSubcategoryChange = (value: string) => {
    onInputChange('subcategory', value);
    const subcategory = subcategories.find(s => s.name === value);
    setSelectedSubcategoryId(subcategory?.id || '');
  };

  // Add new handlers
  const handleAddSection = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addProductSection(name, currentUser.uid);
    if (result.success) {
      await loadSections();
    }
    return result;
  };

  const handleAddCategory = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!formData.section) {
      return { success: false, error: 'Please select a section first' };
    }

    const result = await addProductCategory(name, formData.section, currentUser.uid);
    if (result.success) {
      await loadCategories(formData.section);
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

  const handleAddProductType = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await addStandaloneProductType(name, currentUser.uid);
    if (result.success) {
      await loadProductTypes();
    }
    return result;
  };

  const handleSizeChange = (value: string) => {
    if (value && !sizeOptions.includes(value)) {
      setSizeOptions(prev => [...prev, value]);
    }
    onInputChange('size', value);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Product Name" required>
          <InputField
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            placeholder="Enter product name"
            required
          />
        </FormField>

        <FormField label="Main SKU" required>
          <InputField
            value={formData.sku}
            onChange={(e) => onInputChange('sku', e.target.value)}
            placeholder="Enter main SKU"
            required
          />
        </FormField>

        <FormField label="Section" required>
          <HierarchicalSelect
            value={formData.section}
            onChange={handleSectionChange}
            options={sections.map(section => ({ value: section, label: section }))}
            placeholder="Select or add section"
            onAddNew={handleAddSection}
            required
          />
        </FormField>

        <FormField label="Category">
          <HierarchicalSelect
            value={formData.category}
            onChange={handleCategoryChange}
            options={categories.map(category => ({ value: category.name, label: category.name, id: category.id }))}
            placeholder={formData.section ? "Select or add category" : "Select section first"}
            onAddNew={handleAddCategory}
            disabled={!formData.section}
          />
        </FormField>

        <FormField label="Subcategory">
          <HierarchicalSelect
            value={formData.subcategory}
            onChange={handleSubcategoryChange}
            options={subcategories.map(subcategory => ({ value: subcategory.name, label: subcategory.name, id: subcategory.id }))}
            placeholder={formData.category ? "Select or add subcategory" : "Select category first"}
            onAddNew={handleAddSubcategory}
            disabled={!formData.category}
          />
        </FormField>

        <FormField label="Product Type" required>
          <HierarchicalSelect
            value={formData.type}
            onChange={(value) => onInputChange('type', value)}
            options={productTypes.map(type => ({ value: type, label: type }))}
            placeholder="Select or add product type"
            onAddNew={handleAddProductType}
            required
          />
        </FormField>

        <FormField label="Size (Optional)">
          <div className="space-y-2">
            <SelectField
              value={formData.size || ''}
              onChange={(e) => handleSizeChange(e.target.value)}
              options={[
                { value: '', label: 'Select or enter size' },
                ...sizeOptions.map(option => ({ value: option, label: option }))
              ]}
              allowCustom
            />
            <InputField
              value={formData.size || ''}
              onChange={(e) => handleSizeChange(e.target.value)}
              placeholder="Or type custom size"
              className="text-sm"
            />
          </div>
        </FormField>

        <FormField label="Unit Price" required>
          <InputField
            type="number"
            step="0.01"
            min="0"
            value={formData.unitPrice}
            onChange={(e) => onInputChange('unitPrice', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            required
          />
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Enter product description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
        />
      </FormField>
    </div>
  );
};

export default GeneralTab;