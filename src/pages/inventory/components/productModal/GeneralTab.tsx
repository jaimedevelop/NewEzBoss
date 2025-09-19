import React, { useState, useEffect } from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { useAuthContext } from '../../../../contexts/AuthContext';
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

interface ProductData {
  id?: string;
  name: string;
  trade: string;
  section: string;
  category: string;
  subcategory: string;
  type: string; // Changed from enum to string - now part of hierarchy
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

  // State for hierarchical data - NEW HIERARCHY: Trade -> Section -> Category -> Subcategory -> Type
  const [trades, setTrades] = useState<string[]>([]);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);

  // State for selected IDs to track hierarchy
  const [selectedTradeId, setSelectedTradeId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  // Load initial data
  useEffect(() => {
    if (currentUser?.uid) {
      loadTrades();
    }
  }, [currentUser]);

  // Load sections when trade changes
  useEffect(() => {
    if (selectedTradeId && currentUser?.uid) {
      loadSections(selectedTradeId);
      loadSizes(selectedTradeId); // Load sizes for the trade
    } else {
      setSections([]);
      setCategories([]);
      setSubcategories([]);
      setTypes([]);
      setSizes([]);
    }
  }, [selectedTradeId, currentUser]);

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

  const loadTrades = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getAllAvailableTrades(currentUser.uid);
      if (result.success && result.data) {
        setTrades(result.data);
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  };

  const loadSections = async (tradeId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getProductSections(tradeId, currentUser.uid);
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

  const loadCategories = async (sectionId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getProductCategories(sectionId, currentUser.uid);
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

  const loadSizes = async (tradeId: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const result = await getProductSizes(tradeId, currentUser.uid);
      if (result.success && result.data) {
        setSizes(result.data);
      }
    } catch (error) {
      console.error('Error loading sizes:', error);
    }
  };

  // Handle trade change
  const handleTradeChange = (value: string) => {
    onInputChange('trade', value);
    setSelectedTradeId(value); // For custom trades, we'll use name as ID
    
    // Clear downstream selections
    onInputChange('section', '');
    onInputChange('category', '');
    onInputChange('subcategory', '');
    onInputChange('size', '');
    setSelectedSectionId('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
  };

  // Handle section change
  const handleSectionChange = (value: string) => {
    onInputChange('section', value);
    const section = sections.find(s => s.name === value);
    setSelectedSectionId(section?.id || '');
    
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

  // New handler for adding sizes
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
        <FormField label="Product Name" required>
          <InputField
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            placeholder="Enter product name"
            required
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

        <FormField label="Trade" required>
          <HierarchicalSelect
            value={formData.trade}
            onChange={handleTradeChange}
            options={trades.map(trade => ({ value: trade, label: trade }))}
            placeholder="Select or add trade"
            onAddNew={handleAddTrade}
            required
          />
        </FormField>

        <FormField label="Section">
          <HierarchicalSelect
            value={formData.section}
            onChange={handleSectionChange}
            options={sections.map(section => ({ value: section.name, label: section.name, id: section.id }))}
            placeholder={formData.trade ? "Select or add section" : "Select trade first"}
            onAddNew={handleAddSection}
            disabled={!formData.trade}
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

        <FormField label="Type">
          <HierarchicalSelect
            value={formData.type}
            onChange={(value) => onInputChange('type', value)}
            options={types.map(type => ({ value: type.name, label: type.name, id: type.id }))}
            placeholder={formData.subcategory ? "Select or add type" : "Select subcategory first"}
            onAddNew={handleAddType}
            disabled={!formData.subcategory}
          />
        </FormField>

        <FormField label="Size (Optional)">
          <HierarchicalSelect
            value={formData.size || ''}
            onChange={(value) => onInputChange('size', value)}
            options={sizes.map(size => ({ value: size.name, label: size.name, id: size.id }))}
            placeholder={formData.trade ? "Select or add size" : "Select trade first"}
            onAddNew={handleAddSize}
            disabled={!formData.trade}
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