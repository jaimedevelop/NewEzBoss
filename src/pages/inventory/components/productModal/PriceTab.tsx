import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import HierarchicalSelect from '../../../../mainComponents/forms/HierarchicalSelect';
import { getStores, addStore } from '../../../../services/stores';
import { 
  getProductPrices, 
  addPriceEntry, 
  updatePriceEntry, 
  deletePriceEntry,
  getPriceComparison,
  PriceEntry 
} from '../../../../services/pricing';
import { useAuthContext } from '../../../../contexts/AuthContext';

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

interface PriceTabProps {
  formData: ProductData;
  onInputChange: (field: keyof ProductData, value: any) => void;
}

interface LocalPriceEntry {
  id: string;
  store: string;
  price: string;
  isNew?: boolean;
}

const PriceTab: React.FC<PriceTabProps> = ({ formData, onInputChange }) => {
  const { currentUser } = useAuthContext();
  const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([]);
  const [priceEntries, setPriceEntries] = useState<LocalPriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceComparison, setPriceComparison] = useState<{
    lowestPrice: PriceEntry | null;
    highestPrice: PriceEntry | null;
    averagePrice: number;
  }>({ lowestPrice: null, highestPrice: null, averagePrice: 0 });

  // Load stores and existing prices when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Load stores
        const storesResult = await getStores(currentUser.uid);
        if (storesResult.success && storesResult.data) {
          const options = storesResult.data.map(store => ({
            value: store.name,
            label: store.name
          }));
          setStoreOptions(options);
        }

        // Load existing prices if product has an ID
        if (formData.id) {
          const pricesResult = await getProductPrices(formData.id, currentUser.uid);
          if (pricesResult.success && pricesResult.data) {
            const localPrices = pricesResult.data.map(price => ({
              id: price.id || Date.now().toString(),
              store: price.store,
              price: price.price.toString()
            }));
            setPriceEntries(localPrices);

            // Get price comparison
            const comparisonResult = await getPriceComparison(formData.id, currentUser.uid);
            if (comparisonResult.success && comparisonResult.data) {
              setPriceComparison({
                lowestPrice: comparisonResult.data.lowestPrice,
                highestPrice: comparisonResult.data.highestPrice,
                averagePrice: comparisonResult.data.averagePrice
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading price data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser?.uid, formData.id]);

  const addPrice = () => {
    const newId = Date.now().toString();
    setPriceEntries(prev => [...prev, { id: newId, store: '', price: '', isNew: true }]);
  };

  const updatePrice = (id: string, field: 'store' | 'price', value: string) => {
    setPriceEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removePrice = async (id: string) => {
    const entry = priceEntries.find(p => p.id === id);
    
    // If it's an existing entry (not new), delete from database
    if (entry && !entry.isNew && formData.id && currentUser?.uid) {
      try {
        await deletePriceEntry(id);
      } catch (error) {
        console.error('Error deleting price entry:', error);
      }
    }

    setPriceEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleAddNewStore = async (storeName: string) => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await addStore(storeName, currentUser.uid);
      
      if (result.success) {
        const newOption = { value: storeName, label: storeName };
        setStoreOptions(prev => [...prev, newOption].sort((a, b) => a.label.localeCompare(b.label)));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to add store' };
      }
    } catch (error) {
      console.error('Error adding new store:', error);
      return { success: false, error: 'Failed to add store' };
    }
  };

  const savePriceEntries = async () => {
    if (!formData.id || !currentUser?.uid) return;

    for (const entry of priceEntries) {
      if (entry.store && entry.price && entry.isNew) {
        try {
          await addPriceEntry(
            formData.id,
            entry.store,
            parseFloat(entry.price),
            currentUser.uid
          );
        } catch (error) {
          console.error('Error saving price entry:', error);
        }
      }
    }
  };

  // Save price entries when component unmounts or formData changes
  useEffect(() => {
    return () => {
      savePriceEntries();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Price Information</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading pricing data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Price Information</h3>
        <button
          type="button"
          onClick={addPrice}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Price
        </button>
      </div>

      {/* Main Unit Price */}
      <FormField label="Base Unit Price" required>
        <InputField
          type="number"
          min="0"
          step="0.01"
          value={formData.unitPrice}
          onChange={(e) => onInputChange('unitPrice', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
        />
      </FormField>

      {/* Store-specific prices */}
      <div className="space-y-3">
        {priceEntries.map((entry, index) => (
          <div key={entry.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Store/Supplier">
                <HierarchicalSelect
                  value={entry.store}
                  onChange={(value) => updatePrice(entry.id, 'store', value)}
                  options={storeOptions}
                  placeholder="Select store"
                  onAddNew={handleAddNewStore}
                />
              </FormField>
              <FormField label="Price">
                <InputField
                  type="number"
                  min="0"
                  step="0.01"
                  value={entry.price}
                  onChange={(e) => updatePrice(entry.id, 'price', e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            </div>
            <button
              type="button"
              onClick={() => removePrice(entry.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {priceEntries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No store prices added yet</div>
            <div className="text-xs mt-1">Click "Add Price" to add store-specific pricing</div>
          </div>
        )}
      </div>

      {/* Price comparison summary */}
      {priceEntries.length > 1 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Price Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {priceComparison.lowestPrice && (
              <div className="flex items-center">
                <TrendingDown className="w-4 h-4 text-green-600 mr-2" />
                <div>
                  <span className="text-gray-500">Lowest:</span>
                  <div className="font-medium text-green-600">
                    ${priceComparison.lowestPrice.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {priceComparison.lowestPrice.store}
                  </div>
                </div>
              </div>
            )}

            {priceComparison.highestPrice && (
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-red-600 mr-2" />
                <div>
                  <span className="text-gray-500">Highest:</span>
                  <div className="font-medium text-red-600">
                    ${priceComparison.highestPrice.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {priceComparison.highestPrice.store}
                  </div>
                </div>
              </div>
            )}

            {priceComparison.averagePrice > 0 && (
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
                <div>
                  <span className="text-gray-500">Average:</span>
                  <div className="font-medium text-blue-600">
                    ${priceComparison.averagePrice.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Across {priceEntries.length} stores
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTab;