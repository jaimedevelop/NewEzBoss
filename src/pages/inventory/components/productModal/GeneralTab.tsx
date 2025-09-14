import React, { useState, useEffect } from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
  getAllAvailableSections,
  getProductCategories,
  getProductSubcategories,
  getProductTypes,
  getProductSizes,
  addProductSection,
  addProductCategory,
  addProductSubcategory,
  addProductType,
  addProductSize,
  getAllAvailableProductTypes,
  addStandaloneProductType,
  ProductCategory,
  ProductSubcategory,
  ProductType,
  ProductSize
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
  const [sizes, setSizes] = useState<ProductSize[]>([]);

  // State for selected IDs to track hierarchy
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  // State for standalone product types
  const [productTypes, setProductTypes] = useState<string[]>([]);

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
      loadSizes(selectedSectionId); // Load sizes for the section
    } else {
      setCategories([]);
      setSubcategories([]);
      setTypes([]);
      setSizes([]);
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

  const loadSizes = async (sectionName: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getProductSizes(sectionName, currentUser.uid);
      if (result.success && result.data) {
        setSizes(result.data);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
    }
  };

  // Handle section change
  const handleSectionChange = (value: string) => {
    onInputChange('section', value);
    setSelectedSectionId(value); // For custom sections, we'll use name as ID
    
    // Clear downstream selections
    onInputChange('category', '');
    onInputChange('subcategory', '');
    onInputChange('size', ''); // Clear size when section changes
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

  // New handler for adding sizes
  const handleAddSize = async (name: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!formData.section) {
      return { success: false, error: 'Please select a section first' };
    }

    const result = await addProductSize(name, formData.section, currentUser.uid);
    if (result.success) {
      await loadSizes(formData.section);
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
          <HierarchicalSelect
            value={formData.size || ''}
            onChange={(value) => onInputChange('size', value)}
            options={sizes.map(size => ({ value: size.name, label: size.name, id: size.id }))}
            placeholder={formData.section ? "Select or add size" : "Select section first"}
            onAddNew={handleAddSize}
            disabled={!formData.section}
          />
        </FormField>

        <FormField label="Unit" required>
          <InputField
            value={formData.unit}
            onChange={(e) => onInputChange('unit', e.target.value)}
            placeholder="e.g., ea, ft, lb, gal"
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