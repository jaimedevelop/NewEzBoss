// ============================================================
// 🚧 TEMPORARY COMPONENT - ACCOUNTING SECTION - TO BE MOVED LATER 🚧
// ============================================================
// src/pages/collections/components/CollectionsScreen/components/CollectionCalculator.tsx

import React, { useState, useMemo } from 'react';
import { Plus, Save } from 'lucide-react';

interface CalculatorRow {
  id: string;
  name: string;
  isChecked: boolean;
  currentPrice: string;      // Changed to string for form state
  alternativePrice: string;   // Changed to string for form state
}

interface CollectionCalculatorProps {
  collectionId: string;
  initialFinalSalePrice: number;
  productsTotal: number;
  laborTotal: number;
  toolsTotal: number;
  equipmentTotal: number;
  taxRate: number;
  onSave?: (calculation: any) => void;
}

const CollectionCalculator: React.FC<CollectionCalculatorProps> = ({
  collectionId,
  initialFinalSalePrice,
  productsTotal,
  laborTotal,
  toolsTotal,
  equipmentTotal,
  taxRate,
  onSave
}) => {
  // Initialize rows with string values (allowing empty strings)
  const [finalSalePrice, setFinalSalePrice] = useState(initialFinalSalePrice.toString());
  const [rows, setRows] = useState<CalculatorRow[]>([
    { id: '1', name: 'Products', isChecked: true, currentPrice: productsTotal > 0 ? productsTotal.toString() : '', alternativePrice: '' },
    { id: '2', name: 'Labor', isChecked: true, currentPrice: laborTotal > 0 ? laborTotal.toString() : '', alternativePrice: '' },
    { id: '3', name: 'Tools', isChecked: true, currentPrice: toolsTotal > 0 ? toolsTotal.toString() : '', alternativePrice: '' },
    { id: '4', name: 'Equipment', isChecked: true, currentPrice: equipmentTotal > 0 ? equipmentTotal.toString() : '', alternativePrice: '' },
    { id: '5', name: '', isChecked: true, currentPrice: '', alternativePrice: '' },
    { id: '6', name: '', isChecked: true, currentPrice: '', alternativePrice: '' },
  ]);

  // Calculate totals (convert strings to numbers for calculation)
  const { possibleSalePrice, gainIncrease, finalSaleTax, finalSaleTotal, possibleSaleTax, possibleSaleTotal, totalGainIncrease } = useMemo(() => {
    const possible = rows.reduce((sum, row) => {
      if (!row.isChecked) return sum;
      
      const altPrice = parseFloat(row.alternativePrice) || 0;
      const currPrice = parseFloat(row.currentPrice) || 0;
      const price = altPrice > 0 ? altPrice : currPrice;
      
      return sum + price;
    }, 0);
    
    const finalPrice = parseFloat(finalSalePrice) || 0;
    const gain = possible - finalPrice;
    
    // Tax calculations
    const finalTax = finalPrice * taxRate;
    const finalTotal = finalPrice + finalTax;
    const possibleTax = possible * taxRate;
    const possibleTotal = possible + possibleTax;
    const totalGain = possibleTotal - finalTotal;
    
    return { 
      possibleSalePrice: possible, 
      gainIncrease: gain,
      finalSaleTax: finalTax,
      finalSaleTotal: finalTotal,
      possibleSaleTax: possibleTax,
      possibleSaleTotal: possibleTotal,
      totalGainIncrease: totalGain
    };
  }, [rows, finalSalePrice, taxRate]);

  // Handlers
  const handleNameChange = (id: string, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, name: value } : row));
  };

  const handleCheckChange = (id: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, isChecked: !row.isChecked } : row));
  };

  const handleCurrentPriceChange = (id: string, value: string) => {
    // Allow empty string or valid number input
    if (value === '' || !isNaN(parseFloat(value))) {
      setRows(rows.map(row => row.id === id ? { ...row, currentPrice: value } : row));
    }
  };

  const handleAlternativePriceChange = (id: string, value: string) => {
    // Allow empty string or valid number input
    if (value === '' || !isNaN(parseFloat(value))) {
      setRows(rows.map(row => row.id === id ? { ...row, alternativePrice: value } : row));
    }
  };

  const handleFinalSalePriceChange = (value: string) => {
    // Allow empty string or valid number input
    if (value === '' || !isNaN(parseFloat(value))) {
      setFinalSalePrice(value);
    }
  };

  const addRow = () => {
    const newId = (Math.max(...rows.map(r => parseInt(r.id))) + 1).toString();
    setRows([...rows, { id: newId, name: '', isChecked: true, currentPrice: '', alternativePrice: '' }]);
  };

  const handleSave = () => {
    const calculation = {
      finalSalePrice: parseFloat(finalSalePrice) || 0,
      rows: rows.map(row => ({
        ...row,
        currentPrice: parseFloat(row.currentPrice) || 0,
        alternativePrice: parseFloat(row.alternativePrice) || 0
      })),
      possibleSalePrice,
      gainIncrease,
      lastUpdated: new Date().toISOString()
    };
    
    onSave?.(calculation);
    console.log('💾 Calculator saved:', calculation);
  };

  return (
    <div className="mt-6 bg-yellow-50 rounded-lg shadow-md border-2 border-yellow-400 p-6">
      {/* Header with warning */}
      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
        <p className="text-sm font-semibold text-yellow-800">
          ⚠️ TEMPORARY CALCULATOR - Will be moved to Accounting section
        </p>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-4">Price Calculator</h3>

      {/* Final Sale Price */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Final Sale Price
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={finalSalePrice}
          onChange={(e) => handleFinalSalePriceChange(e.target.value)}
          placeholder="0.00"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Calculator Grid */}
      <div className="bg-white rounded-lg p-4 mb-4">
        {/* Headers */}
        <div className="grid grid-cols-12 gap-2 mb-2 pb-2 border-b-2 border-gray-300">
          <div className="col-span-1"></div>
          <div className="col-span-4 text-sm font-semibold text-gray-700">Name</div>
          <div className="col-span-3 text-sm font-semibold text-gray-700">Current Price</div>
          <div className="col-span-4 text-sm font-semibold text-gray-700">Alternative Price</div>
        </div>

        {/* Rows */}
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
            {/* Checkbox */}
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={row.isChecked}
                onChange={() => handleCheckChange(row.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>

            {/* Name */}
            <div className="col-span-4">
              <input
                type="text"
                value={row.name}
                onChange={(e) => handleNameChange(row.id, e.target.value)}
                placeholder={index >= 4 ? "Optional add-on" : ""}
                disabled={index < 4 || !row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${
                  index < 4 || !row.isChecked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Current Price */}
            <div className="col-span-3">
              <input
                type="text"
                inputMode="decimal"
                value={row.currentPrice}
                onChange={(e) => handleCurrentPriceChange(row.id, e.target.value)}
                placeholder="0.00"
                disabled={!row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${
                  !row.isChecked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Alternative Price */}
            <div className="col-span-4">
              <input
                type="text"
                inputMode="decimal"
                value={row.alternativePrice}
                onChange={(e) => handleAlternativePriceChange(row.id, e.target.value)}
                placeholder="0.00"
                disabled={!row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${
                  !row.isChecked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>
        ))}

        {/* Add Row Button */}
        <button
          onClick={addRow}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border-2 border-dashed border-blue-300"
        >
          <Plus className="w-5 h-5" />
          Add Row
        </button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Pre-Tax Comparison */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Pre-Tax Comparison</h4>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Final Sale Price:</span>
            <span className="font-bold text-gray-900">${(parseFloat(finalSalePrice) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Possible Sale Price:</span>
            <span className="font-bold text-gray-900">${possibleSalePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
            <span className="font-bold text-gray-700">Pre-Tax Gain:</span>
            <span className={`font-bold ${
              gainIncrease > 0 ? 'text-green-600' : gainIncrease < 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {gainIncrease > 0 ? '+' : ''}${gainIncrease.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <h4 className="text-sm font-bold text-blue-900 mb-3">Plus Tax ({(taxRate * 100).toFixed(1)}%)</h4>
          
          {/* Final Sale with Tax */}
          <div className="mb-3 pb-3 border-b border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">FINAL SALE</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Subtotal:</span>
              <span className="text-gray-900">${(parseFloat(finalSalePrice) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Tax:</span>
              <span className="text-gray-900">${finalSaleTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">${finalSaleTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Possible Sale with Tax */}
          <div className="mb-3 pb-3 border-b border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">POSSIBLE SALE</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Subtotal:</span>
              <span className="text-gray-900">${possibleSalePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Tax:</span>
              <span className="text-gray-900">${possibleSaleTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">${possibleSaleTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Total Gain with Tax */}
          <div className="bg-white rounded p-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Gain (With Tax):</span>
              <span className={`font-bold text-xl ${
                totalGainIncrease > 0 ? 'text-green-600' : totalGainIncrease < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {totalGainIncrease > 0 ? '+' : ''}${totalGainIncrease.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
      >
        <Save className="w-5 h-5" />
        Save Calculator
      </button>
    </div>
  );
};

export default CollectionCalculator;

// ============================================================
// 🚧 END TEMPORARY COMPONENT - ACCOUNTING SECTION 🚧
// ============================================================