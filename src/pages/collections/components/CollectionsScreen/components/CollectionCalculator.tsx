// ============================================================
// 🚧 TEMPORARY COMPONENT - ACCOUNTING SECTION - TO BE MOVED LATER 🚧
// ============================================================
// src/pages/collections/components/CollectionsScreen/components/CollectionCalculator.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

interface CalculatorRow {
  id: string;
  name: string;
  isChecked: boolean;
  currentPrice: string;
  alternativePrice: string;
}

interface CollectionCalculatorProps {
  collectionId: string;
  initialFinalSalePrice: number;
  productsTotal: number;
  laborTotal: number;
  toolsTotal: number;
  equipmentTotal: number;
  taxRate: number;
  savedCalculations?: any;
  onSave?: (calculation: any) => void;
  onFinalSalePriceChange?: (price: number) => void;
}

const CollectionCalculator: React.FC<CollectionCalculatorProps> = ({
  collectionId,
  initialFinalSalePrice,
  productsTotal,
  laborTotal,
  toolsTotal,
  equipmentTotal,
  taxRate,
  savedCalculations,
  onSave,
  onFinalSalePriceChange
}) => {
  const [finalSalePrice, setFinalSalePrice] = useState(() => {
    if (savedCalculations?.finalSalePrice) return savedCalculations.finalSalePrice.toString();
    return initialFinalSalePrice.toString();
  });

  const [rows, setRows] = useState<CalculatorRow[]>(() => {
    if (savedCalculations?.rows && savedCalculations.rows.length > 0) {
      return savedCalculations.rows.map((row: any) => ({
        ...row,
        currentPrice: row.currentPrice.toString(),
        alternativePrice: row.alternativePrice.toString()
      }));
    }
    return [
      { id: '1', name: 'Products', isChecked: true, currentPrice: productsTotal > 0 ? productsTotal.toString() : '', alternativePrice: '' },
      { id: '2', name: 'Labor', isChecked: true, currentPrice: laborTotal > 0 ? laborTotal.toString() : '', alternativePrice: '' },
      { id: '3', name: 'Tools', isChecked: true, currentPrice: toolsTotal > 0 ? toolsTotal.toString() : '', alternativePrice: '' },
      { id: '4', name: 'Equipment', isChecked: true, currentPrice: equipmentTotal > 0 ? equipmentTotal.toString() : '', alternativePrice: '' },
      { id: '5', name: '', isChecked: true, currentPrice: '', alternativePrice: '' },
      { id: '6', name: '', isChecked: true, currentPrice: '', alternativePrice: '' },
    ];
  });

  const [savedState, setSavedState] = useState(() => ({
    finalSalePrice: savedCalculations?.finalSalePrice?.toString() || initialFinalSalePrice.toString(),
    rows: savedCalculations?.rows || []
  }));

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick-price multiplier state
  const [multiplier, setMultiplier] = useState<'x2' | 'x3' | 'pct' | null>(null);
  const [pctInput, setPctInput] = useState('');

  const { possibleSalePrice, gainIncrease, finalSaleTax, finalSaleTotal, possibleSaleTax, possibleSaleTotal, totalGainIncrease, totalCosts } = useMemo(() => {
    const costs = rows.reduce((sum, row) => {
      if (!row.isChecked) return sum;
      return sum + (parseFloat(row.currentPrice) || 0);
    }, 0);

    const possible = rows.reduce((sum, row) => {
      if (!row.isChecked) return sum;
      const alt = parseFloat(row.alternativePrice) || 0;
      const curr = parseFloat(row.currentPrice) || 0;
      return sum + (alt > 0 ? alt : curr);
    }, 0);

    const finalPrice = parseFloat(finalSalePrice) || 0;
    const gain = finalPrice - costs;
    const finalTax = finalPrice * taxRate;
    const finalTotal = finalPrice + finalTax;
    const possibleTax = possible * taxRate;
    const possibleTotal = possible + possibleTax;
    const totalGain = possibleTotal - finalTotal;

    return { possibleSalePrice: possible, gainIncrease: gain, finalSaleTax: finalTax, finalSaleTotal: finalTotal, possibleSaleTax: possibleTax, possibleSaleTotal: possibleTotal, totalGainIncrease: totalGain, totalCosts: costs };
  }, [rows, finalSalePrice, taxRate]);

  // Computed charge price based on selected multiplier
  const chargePrice = useMemo(() => {
    if (multiplier === 'x2') return totalCosts * 2;
    if (multiplier === 'x3') return totalCosts * 3;
    if (multiplier === 'pct') {
      const pct = parseFloat(pctInput);
      if (!isNaN(pct) && pct > 0) return totalCosts * (pct / 100);
    }
    return null;
  }, [multiplier, pctInput, totalCosts]);

  const handleNameChange = (id: string, v: string) => setRows(rows.map(r => r.id === id ? { ...r, name: v } : r));
  const handleCheckChange = (id: string) => setRows(rows.map(r => r.id === id ? { ...r, isChecked: !r.isChecked } : r));

  const handleCurrentPriceChange = (id: string, v: string) => {
    if (v === '' || !isNaN(parseFloat(v))) setRows(rows.map(r => r.id === id ? { ...r, currentPrice: v } : r));
  };

  const handleAlternativePriceChange = (id: string, v: string) => {
    if (v === '' || !isNaN(parseFloat(v))) setRows(rows.map(r => r.id === id ? { ...r, alternativePrice: v } : r));
  };

  const handleFinalSalePriceChange = (v: string) => {
    if (v === '' || !isNaN(parseFloat(v))) {
      setFinalSalePrice(v);
      if (onFinalSalePriceChange) onFinalSalePriceChange(parseFloat(v) || 0);
    }
  };

  const addRow = () => {
    const newId = (Math.max(...rows.map(r => parseInt(r.id))) + 1).toString();
    setRows([...rows, { id: newId, name: '', isChecked: true, currentPrice: '', alternativePrice: '' }]);
  };

  const removeRow = (id: string) => setRows(rows.filter(r => r.id !== id));

  const handleSave = async () => {
    const calculation = {
      finalSalePrice: parseFloat(finalSalePrice) || 0,
      rows: rows.map(r => ({ ...r, currentPrice: parseFloat(r.currentPrice) || 0, alternativePrice: parseFloat(r.alternativePrice) || 0 })),
      possibleSalePrice,
      gainIncrease,
      lastUpdated: new Date().toISOString()
    };
    if (onSave) {
      await onSave(calculation);
      setSavedState({
        finalSalePrice,
        rows: rows.map(r => ({ ...r, currentPrice: parseFloat(r.currentPrice) || 0, alternativePrice: parseFloat(r.alternativePrice) || 0 }))
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    console.log('💾 Calculator saved:', calculation);
  };

  const hasUnsavedChanges = useMemo(() => {
    if (finalSalePrice !== savedState.finalSalePrice) return true;
    if (rows.length !== savedState.rows.length) return true;
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i], sav = savedState.rows[i];
      if (!sav) return true;
      if (cur.name !== sav.name || cur.isChecked !== sav.isChecked ||
        (parseFloat(cur.currentPrice) || 0) !== (sav.currentPrice || 0) ||
        (parseFloat(cur.alternativePrice) || 0) !== (sav.alternativePrice || 0)) return true;
    }
    return false;
  }, [finalSalePrice, rows, savedState]);

  const btnBase = 'px-3 py-1.5 text-xs font-bold rounded border-2 transition-colors';
  const btnActive = 'bg-blue-600 text-white border-blue-600';
  const btnInactive = 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50';

  return (
    <div className="mt-6 bg-yellow-50 rounded-lg shadow-md border-2 border-yellow-400 p-6">
      {/* Header warning */}
      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
        <p className="text-sm font-semibold text-yellow-800">
          ⚠️ TEMPORARY CALCULATOR - Will be moved to Accounting section
        </p>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-4">Price Calculator</h3>

      {/* Final Sale Price + Quick Price Tool */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start">
        {/* Final Sale Price — narrower */}
        <div className="w-full sm:w-48 flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Final Sale Price (Labor Revenue)
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

        {/* Quick Charge Price Tool */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-bold">Current</span> Total Cost:{' '}
            <span className="font-semibold text-gray-900">${totalCosts.toFixed(2)}</span>
          </p>

          {/* Multiplier buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setMultiplier(multiplier === 'x2' ? null : 'x2')}
              className={`${btnBase} ${multiplier === 'x2' ? btnActive : btnInactive}`}
            >
              ×2
            </button>
            <button
              onClick={() => setMultiplier(multiplier === 'x3' ? null : 'x3')}
              className={`${btnBase} ${multiplier === 'x3' ? btnActive : btnInactive}`}
            >
              ×3
            </button>
            <button
              onClick={() => setMultiplier(multiplier === 'pct' ? null : 'pct')}
              className={`${btnBase} ${multiplier === 'pct' ? btnActive : btnInactive}`}
            >
              %
            </button>
            {multiplier === 'pct' && (
              <input
                type="text"
                inputMode="decimal"
                value={pctInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || !isNaN(parseFloat(v))) setPctInput(v);
                }}
                placeholder="e.g. 150"
                className="w-24 px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Charge Price result */}
          {chargePrice !== null && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Charge Price: </span>
                <span className="text-lg font-bold text-green-600">${chargePrice.toFixed(2)}</span>
              </div>
              <button
                onClick={() => handleFinalSalePriceChange(chargePrice.toFixed(2))}
                className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Use as Sale Price
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calculator Grid */}
      <div className="bg-white rounded-lg p-4 mb-4">
        {/* Headers */}
        <div className="grid grid-cols-12 gap-2 mb-2 pb-2 border-b-2 border-gray-300">
          <div className="col-span-1"></div>
          <div className="col-span-3 text-sm font-semibold text-gray-700">Name</div>
          <div className="col-span-3 text-sm font-semibold text-gray-700">Current Cost</div>
          <div className="col-span-4 text-sm font-semibold text-gray-700">Alternative Charge</div>
          <div className="col-span-1"></div>
        </div>

        {/* Rows */}
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <div className="col-span-1">
              <input type="checkbox" checked={row.isChecked} onChange={() => handleCheckChange(row.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            </div>
            <div className="col-span-3">
              <input type="text" value={row.name} onChange={(e) => handleNameChange(row.id, e.target.value)}
                placeholder={index >= 4 ? 'Optional add-on' : ''}
                disabled={index < 4 || !row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${index < 4 || !row.isChecked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                  }`} />
            </div>
            <div className="col-span-3">
              <input type="text" inputMode="decimal" value={row.currentPrice}
                onChange={(e) => handleCurrentPriceChange(row.id, e.target.value)}
                placeholder="0.00" disabled={!row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${!row.isChecked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                  }`} />
            </div>
            <div className="col-span-4">
              <input type="text" inputMode="decimal" value={row.alternativePrice}
                onChange={(e) => handleAlternativePriceChange(row.id, e.target.value)}
                placeholder="0.00" disabled={!row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${!row.isChecked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                  }`} />
            </div>
            <div className="col-span-1">
              {index >= 4 && (
                <button onClick={() => removeRow(row.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove row">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        <button onClick={addRow}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
          <Plus className="w-5 h-5" />
          Add Row
        </button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Pre-Tax Profit */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Pre-Tax Profit</h4>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Final Sale Price (Revenue):</span>
            <span className="font-bold text-gray-900">${(parseFloat(finalSalePrice) || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Total Costs:</span>
            <span className="font-bold text-gray-900">${totalCosts.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
            <span className="font-bold text-gray-700">Pre-Tax Profit:</span>
            <span className={`font-bold ${gainIncrease > 0 ? 'text-green-600' : gainIncrease < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {gainIncrease > 0 ? '+' : ''}${gainIncrease.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <h4 className="text-sm font-bold text-blue-900 mb-3">Plus Tax ({(taxRate * 100).toFixed(1)}%)</h4>

          <div className="mb-3 pb-3 border-b border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">FINAL SALE (With Tax)</p>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Revenue:</span>
              <span className="text-gray-900">${(parseFloat(finalSalePrice) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Tax:</span>
              <span className="text-gray-900">${finalSaleTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-900">Total Revenue:</span>
              <span className="text-gray-900">${finalSaleTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white rounded p-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Revenue (with tax):</span>
                <span className="text-gray-900">${finalSaleTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Costs:</span>
                <span className="text-gray-900">${totalCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">Total Profit:</span>
                <span className={`font-bold text-xl ${(finalSaleTotal - totalCosts) > 0 ? 'text-green-600' : (finalSaleTotal - totalCosts) < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                  {(finalSaleTotal - totalCosts) > 0 ? '+' : ''}${(finalSaleTotal - totalCosts).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4 space-y-2">
        <button onClick={handleSave} disabled={!hasUnsavedChanges}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${hasUnsavedChanges ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}>
          <Save className="w-5 h-5" />
          {hasUnsavedChanges ? 'Save Calculator' : 'No Changes to Save'}
        </button>
        {saveSuccess && (
          <div className="text-center text-sm text-green-600 font-semibold">
            ✅ Calculator saved successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionCalculator;