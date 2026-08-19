// ============================================================
// 🚧 TEMPORARY COMPONENT - ACCOUNTING SECTION - TO BE MOVED LATER 🚧
// ============================================================
// src/pages/collections/components/CollectionsScreen/components/CollectionCalculator.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';

interface CalculatorRow {
  id: string;
  name: string;
  isChecked: boolean;
  currentPrice: string;
  alternativePrice: string;
  taxEnabled: boolean;
  taxRate: string; // percentage, e.g. "7.00"
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
  onClear?: () => Promise<boolean>;
  onFinalSalePriceChange?: (price: number) => void;
}

// Round a numeric string to hundredths (2 decimal places), returned as a string.
const roundToHundredths = (v: string): string => {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toFixed(2);
};

// Restrict a raw decimal-input string to at most 2 decimal places while typing.
const limitToTwoDecimals = (v: string): string | null => {
  if (v === '' || v === '.') return v;
  if (!/^\d*\.?\d{0,2}$/.test(v)) return null;
  if (isNaN(parseFloat(v)) && v !== '.') return null;
  return v;
};

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
  onClear,
  onFinalSalePriceChange
}) => {
  const defaultTaxRatePct = (taxRate * 100).toFixed(2);

  const defaultRows = (): CalculatorRow[] => [
    { id: '1', name: 'Products', isChecked: true, currentPrice: productsTotal > 0 ? productsTotal.toString() : '', alternativePrice: '', taxEnabled: true, taxRate: defaultTaxRatePct },
    { id: '2', name: 'Labor', isChecked: true, currentPrice: laborTotal > 0 ? laborTotal.toString() : '', alternativePrice: '', taxEnabled: true, taxRate: defaultTaxRatePct },
    { id: '3', name: 'Tools', isChecked: true, currentPrice: toolsTotal > 0 ? toolsTotal.toString() : '', alternativePrice: '', taxEnabled: true, taxRate: defaultTaxRatePct },
    { id: '4', name: 'Equipment', isChecked: true, currentPrice: equipmentTotal > 0 ? equipmentTotal.toString() : '', alternativePrice: '', taxEnabled: true, taxRate: defaultTaxRatePct },
    { id: '5', name: '', isChecked: true, currentPrice: '', alternativePrice: '', taxEnabled: true, taxRate: defaultTaxRatePct },
    { id: '6', name: '', isChecked: true, currentPrice: '', alternativePrice: '', taxEnabled: true, taxRate: defaultTaxRatePct },
  ];

  const [finalSalePrice, setFinalSalePrice] = useState(() => {
    if (savedCalculations?.finalSalePrice) return savedCalculations.finalSalePrice.toString();
    return initialFinalSalePrice.toString();
  });

  const [rows, setRows] = useState<CalculatorRow[]>(() => {
    if (savedCalculations?.rows && savedCalculations.rows.length > 0) {
      return savedCalculations.rows.map((row: any) => ({
        ...row,
        currentPrice: row.currentPrice.toString(),
        alternativePrice: row.alternativePrice.toString(),
        taxEnabled: row.taxEnabled ?? true,
        taxRate: row.taxRate != null ? Number(row.taxRate).toFixed(2) : defaultTaxRatePct,
      }));
    }
    return defaultRows();
  });

  const [savedState, setSavedState] = useState(() => ({
    finalSalePrice: savedCalculations?.finalSalePrice?.toString() || initialFinalSalePrice.toString(),
    rows: (savedCalculations?.rows || []).map((r: any) => ({
      ...r,
      taxEnabled: r.taxEnabled ?? true,
      taxRate: r.taxRate != null ? Number(r.taxRate) : parseFloat(defaultTaxRatePct),
    })),
    manualPriceEnabled: savedCalculations?.manualPriceEnabled ?? false,
    manualPrice: savedCalculations?.manualPrice != null ? savedCalculations.manualPrice.toString() : '',
  }));

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick-price multiplier state
  const [multiplier, setMultiplier] = useState<'x2' | 'x3' | 'pct' | null>(null);
  const [pctInput, setPctInput] = useState('');

  // Manual Price comparison tool
  const [manualPriceEnabled, setManualPriceEnabled] = useState<boolean>(
    () => savedCalculations?.manualPriceEnabled ?? false
  );
  const [manualPrice, setManualPrice] = useState<string>(
    () => (savedCalculations?.manualPrice != null ? savedCalculations.manualPrice.toString() : '')
  );

  // Sync finalSalePrice when incoming labor revenue changes
  useEffect(() => {
    setFinalSalePrice(initialFinalSalePrice.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFinalSalePrice]);

  // Keep the four linked rows (Products/Labor/Tools/Equipment) synced to live totals
  useEffect(() => {
    setRows(prev => prev.map(row => {
      switch (row.id) {
        case '1':
          return { ...row, currentPrice: productsTotal > 0 ? productsTotal.toString() : '' };
        case '2':
          return { ...row, currentPrice: laborTotal > 0 ? laborTotal.toString() : '' };
        case '3':
          return { ...row, currentPrice: toolsTotal > 0 ? toolsTotal.toString() : '' };
        case '4':
          return { ...row, currentPrice: equipmentTotal > 0 ? equipmentTotal.toString() : '' };
        default:
          return row;
      }
    }));
  }, [productsTotal, laborTotal, toolsTotal, equipmentTotal]);

  const {
    totalCosts,
    totalTax,
    totalCostsWithTax,
    possibleSalePrice,
    possibleTax,
    possibleTotalWithTax,
    gainIncrease,
  } = useMemo(() => {
    let costs = 0;
    let tax = 0;
    let possible = 0;
    let possibleTaxSum = 0;

    rows.forEach(row => {
      if (!row.isChecked) return;
      const curr = parseFloat(row.currentPrice) || 0;
      const alt = parseFloat(row.alternativePrice) || 0;
      const rate = row.taxEnabled ? (parseFloat(row.taxRate) || 0) / 100 : 0;
      const rowBase = alt > 0 ? alt : curr;

      costs += curr;
      tax += curr * rate;
      possible += rowBase;
      possibleTaxSum += rowBase * rate;
    });

    const finalPrice = parseFloat(finalSalePrice) || 0;
    const costsWithTax = costs + tax;
    const possibleWithTax = possible + possibleTaxSum;
    const gain = finalPrice - costsWithTax;

    return {
      totalCosts: costs,
      totalTax: tax,
      totalCostsWithTax: costsWithTax,
      possibleSalePrice: possible,
      possibleTax: possibleTaxSum,
      possibleTotalWithTax: possibleWithTax,
      gainIncrease: gain,
    };
  }, [rows, finalSalePrice]);

  // Manual Price comparison math (mirrors the actual-price math, minus material rows)
  const {
    manualPreTaxProfit,
    manualTotalCostWithTax,
    manualTotalProfit,
    manualProfitMargin,
  } = useMemo(() => {
    const manual = parseFloat(manualPrice) || 0;
    return {
      manualPreTaxProfit: manual - totalCosts,
      manualTotalCostWithTax: totalCostsWithTax,
      manualTotalProfit: manual - totalCostsWithTax,
      manualProfitMargin: manual > 0 ? ((manual - totalCostsWithTax) / manual) * 100 : 0,
    };
  }, [manualPrice, totalCosts, totalCostsWithTax]);

  // Profit margin = Total Profit / Revenue, as a percentage
  const profitMargin = useMemo(() => {
    const finalPrice = parseFloat(finalSalePrice) || 0;
    return finalPrice > 0 ? (gainIncrease / finalPrice) * 100 : 0;
  }, [finalSalePrice, gainIncrease]);

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
  const handleTaxEnabledChange = (id: string) => setRows(rows.map(r => r.id === id ? { ...r, taxEnabled: !r.taxEnabled } : r));

  const handleCurrentPriceChange = (id: string, v: string) => {
    const limited = limitToTwoDecimals(v);
    if (limited !== null) setRows(rows.map(r => r.id === id ? { ...r, currentPrice: limited } : r));
  };

  const handleAlternativePriceChange = (id: string, v: string) => {
    const limited = limitToTwoDecimals(v);
    if (limited !== null) setRows(rows.map(r => r.id === id ? { ...r, alternativePrice: limited } : r));
  };

  const handleTaxRateChange = (id: string, v: string) => {
    const limited = limitToTwoDecimals(v);
    if (limited !== null) setRows(rows.map(r => r.id === id ? { ...r, taxRate: limited } : r));
  };

  // Round money/rate fields to hundredths when the user leaves the field
  const handleCurrentPriceBlur = (id: string, v: string) => {
    if (v === '') return;
    setRows(rows.map(r => r.id === id ? { ...r, currentPrice: roundToHundredths(v) } : r));
  };

  const handleAlternativePriceBlur = (id: string, v: string) => {
    if (v === '') return;
    setRows(rows.map(r => r.id === id ? { ...r, alternativePrice: roundToHundredths(v) } : r));
  };

  const handleTaxRateBlur = (id: string, v: string) => {
    if (v === '') return;
    setRows(rows.map(r => r.id === id ? { ...r, taxRate: roundToHundredths(v) } : r));
  };

  const handleFinalSalePriceChange = (v: string) => {
    const limited = limitToTwoDecimals(v);
    if (limited !== null) {
      setFinalSalePrice(limited);
      if (onFinalSalePriceChange) onFinalSalePriceChange(parseFloat(limited) || 0);
    }
  };

  const handleFinalSalePriceBlur = (v: string) => {
    if (v === '') return;
    const rounded = roundToHundredths(v);
    setFinalSalePrice(rounded);
    if (onFinalSalePriceChange) onFinalSalePriceChange(parseFloat(rounded) || 0);
  };

  const handleManualPriceChange = (v: string) => {
    const limited = limitToTwoDecimals(v);
    if (limited !== null) setManualPrice(limited);
  };

  const handleManualPriceBlur = (v: string) => {
    if (v === '') return;
    setManualPrice(roundToHundredths(v));
  };

  const addRow = () => {
    const newId = (Math.max(...rows.map(r => parseInt(r.id))) + 1).toString();
    setRows([...rows, { id: newId, name: '', isChecked: true, currentPrice: '', alternativePrice: '', taxEnabled: true, taxRate: defaultTaxRatePct }]);
  };

  const removeRow = (id: string) => setRows(rows.filter(r => r.id !== id));

  const handleSave = async () => {
    const cleanedRows = rows.map(r => ({
      id: r.id,
      name: r.name,
      isChecked: r.isChecked,
      currentPrice: parseFloat(r.currentPrice) || 0,
      alternativePrice: parseFloat(r.alternativePrice) || 0,
      taxEnabled: r.taxEnabled,
      taxRate: parseFloat(r.taxRate) || 0,
    }));

    const calculation = {
      finalSalePrice: parseFloat(finalSalePrice) || 0,
      rows: cleanedRows,
      possibleSalePrice,
      gainIncrease,
      lastUpdated: new Date().toISOString(),
      manualPriceEnabled,
      manualPrice: parseFloat(manualPrice) || 0,
    };
    if (onSave) {
      await onSave(calculation);
      setSavedState({
        finalSalePrice,
        rows: cleanedRows,
        manualPriceEnabled,
        manualPrice,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    console.log('💾 Calculator saved:', calculation);
  };

  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    if (!onClear) return;
    if (!window.confirm('Clear the saved calculator for this collection? This cannot be undone.')) return;

    setIsClearing(true);
    try {
      const success = await onClear();
      if (success) {
        const resetRows = defaultRows();
        setRows(resetRows);
        setFinalSalePrice(initialFinalSalePrice.toString());
        setManualPriceEnabled(false);
        setManualPrice('');
        setSavedState({
          finalSalePrice: initialFinalSalePrice.toString(),
          rows: [],
          manualPriceEnabled: false,
          manualPrice: '',
        });
        if (onFinalSalePriceChange) onFinalSalePriceChange(initialFinalSalePrice);
      }
    } finally {
      setIsClearing(false);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    if (finalSalePrice !== savedState.finalSalePrice) return true;
    if (manualPriceEnabled !== savedState.manualPriceEnabled) return true;
    if ((parseFloat(manualPrice) || 0) !== (parseFloat(savedState.manualPrice) || 0)) return true;
    if (rows.length !== savedState.rows.length) return true;
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i], sav = savedState.rows[i];
      if (!sav) return true;
      if (cur.name !== sav.name || cur.isChecked !== sav.isChecked ||
        (parseFloat(cur.currentPrice) || 0) !== (sav.currentPrice || 0) ||
        (parseFloat(cur.alternativePrice) || 0) !== (sav.alternativePrice || 0) ||
        cur.taxEnabled !== (sav.taxEnabled ?? true) ||
        (parseFloat(cur.taxRate) || 0) !== (sav.taxRate ?? parseFloat(defaultTaxRatePct))) return true;
    }
    return false;
  }, [finalSalePrice, rows, savedState, defaultTaxRatePct, manualPriceEnabled, manualPrice]);

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
            onBlur={(e) => handleFinalSalePriceBlur(e.target.value)}
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
                  const limited = limitToTwoDecimals(e.target.value);
                  if (limited !== null) setPctInput(limited);
                }}
                onBlur={(e) => setPctInput(roundToHundredths(e.target.value))}
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

        {/* Manual Price toggle + input */}
        <div className="w-full sm:w-auto flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Manual Price
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManualPriceEnabled(!manualPriceEnabled)}
              className={`${btnBase} ${manualPriceEnabled ? btnActive : btnInactive}`}
            >
              {manualPriceEnabled ? 'ON' : 'OFF'}
            </button>
            {manualPriceEnabled && (
              <input
                type="text"
                inputMode="decimal"
                value={manualPrice}
                onChange={(e) => handleManualPriceChange(e.target.value)}
                onBlur={(e) => handleManualPriceBlur(e.target.value)}
                placeholder="0.00"
                className="w-28 px-3 py-1.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* Calculator Grid */}
      <div className="bg-white rounded-lg p-4 mb-4 overflow-x-auto">
        {/* Headers */}
        <div className="grid grid-cols-12 gap-2 mb-2 pb-2 border-b-2 border-gray-300 min-w-[720px]">
          <div className="col-span-1"></div>
          <div className="col-span-2 text-sm font-semibold text-gray-700">Name</div>
          <div className="col-span-2 text-sm font-semibold text-gray-700">Current Cost</div>
          <div className="col-span-3 text-sm font-semibold text-gray-700">Alternative Charge</div>
          <div className="col-span-3 text-sm font-semibold text-gray-700">Tax</div>
          <div className="col-span-1"></div>
        </div>

        {/* Rows */}
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 mb-2 items-center min-w-[720px]">
            <div className="col-span-1">
              <input type="checkbox" checked={row.isChecked} onChange={() => handleCheckChange(row.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <input type="text" value={row.name} onChange={(e) => handleNameChange(row.id, e.target.value)}
                placeholder={index >= 4 ? 'Optional add-on' : ''}
                disabled={index < 4 || !row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${index < 4 || !row.isChecked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                  }`} />
            </div>
            <div className="col-span-2">
              <input type="text" inputMode="decimal" value={row.currentPrice}
                onChange={(e) => handleCurrentPriceChange(row.id, e.target.value)}
                onBlur={(e) => handleCurrentPriceBlur(row.id, e.target.value)}
                placeholder="0.00" disabled={!row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${!row.isChecked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                  }`} />
            </div>
            <div className="col-span-3">
              <input type="text" inputMode="decimal" value={row.alternativePrice}
                onChange={(e) => handleAlternativePriceChange(row.id, e.target.value)}
                onBlur={(e) => handleAlternativePriceBlur(row.id, e.target.value)}
                placeholder="0.00" disabled={!row.isChecked}
                className={`w-full px-3 py-2 border rounded transition-colors ${!row.isChecked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                  }`} />
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={row.taxEnabled}
                onChange={() => handleTaxEnabledChange(row.id)}
                disabled={!row.isChecked}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
              />
              {row.taxEnabled && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.taxRate}
                    onChange={(e) => handleTaxRateChange(row.id, e.target.value)}
                    onBlur={(e) => handleTaxRateBlur(row.id, e.target.value)}
                    disabled={!row.isChecked}
                    className={`w-16 px-2 py-1.5 text-sm border rounded transition-colors ${!row.isChecked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500'
                      }`}
                  />
                  <span className="text-xs text-gray-600">%</span>
                </div>
              )}
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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-700">Pre-Tax Profit</h4>
            {manualPriceEnabled && (
              <div className="flex gap-8 pr-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Actual</span>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Manual</span>
              </div>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Final Sale Price (Revenue):</span>
            <div className="flex gap-8">
              <span className="font-bold text-gray-900 text-right min-w-[80px]">${(parseFloat(finalSalePrice) || 0).toFixed(2)}</span>
              {manualPriceEnabled && (
                <span className="font-bold text-purple-700 text-right min-w-[80px]">${(parseFloat(manualPrice) || 0).toFixed(2)}</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Total Costs (before tax):</span>
            <div className="flex gap-8">
              <span className="font-bold text-gray-900 text-right min-w-[80px]">${totalCosts.toFixed(2)}</span>
              {manualPriceEnabled && (
                <span className="font-bold text-purple-700 text-right min-w-[80px]">${totalCosts.toFixed(2)}</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
            <span className="font-bold text-gray-700">Pre-Tax Profit:</span>
            <div className="flex gap-8">
              <span className={`font-bold text-right min-w-[80px] ${(parseFloat(finalSalePrice) || 0) - totalCosts > 0 ? 'text-green-600' : (parseFloat(finalSalePrice) || 0) - totalCosts < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {((parseFloat(finalSalePrice) || 0) - totalCosts) > 0 ? '+' : ''}${((parseFloat(finalSalePrice) || 0) - totalCosts).toFixed(2)}
              </span>
              {manualPriceEnabled && (
                <span className={`font-bold text-right min-w-[80px] ${manualPreTaxProfit > 0 ? 'text-green-600' : manualPreTaxProfit < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {manualPreTaxProfit > 0 ? '+' : ''}${manualPreTaxProfit.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-blue-900">Category Tax</h4>
            {manualPriceEnabled && (
              <div className="flex gap-8 pr-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Actual</span>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Manual</span>
              </div>
            )}
          </div>

          <div className="mb-3 pb-3 border-b border-blue-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Total Costs (before tax):</span>
              <div className="flex gap-8">
                <span className="text-gray-900 text-right min-w-[80px]">${totalCosts.toFixed(2)}</span>
                {manualPriceEnabled && (
                  <span className="text-purple-700 text-right min-w-[80px]">${totalCosts.toFixed(2)}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Total Tax:</span>
              <div className="flex gap-8">
                <span className="text-gray-900 text-right min-w-[80px]">${totalTax.toFixed(2)}</span>
                {manualPriceEnabled && (
                  <span className="text-purple-700 text-right min-w-[80px]">${totalTax.toFixed(2)}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-900">Total Cost (with tax):</span>
              <div className="flex gap-8">
                <span className="text-gray-900 text-right min-w-[80px]">${totalCostsWithTax.toFixed(2)}</span>
                {manualPriceEnabled && (
                  <span className="text-purple-700 text-right min-w-[80px]">${manualTotalCostWithTax.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded p-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Final Sale Price (Revenue):</span>
                <div className="flex gap-8">
                  <span className="text-gray-900 text-right min-w-[80px]">${(parseFloat(finalSalePrice) || 0).toFixed(2)}</span>
                  {manualPriceEnabled && (
                    <span className="text-purple-700 text-right min-w-[80px]">${(parseFloat(manualPrice) || 0).toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Cost (with tax):</span>
                <div className="flex gap-8">
                  <span className="text-gray-900 text-right min-w-[80px]">${totalCostsWithTax.toFixed(2)}</span>
                  {manualPriceEnabled && (
                    <span className="text-purple-700 text-right min-w-[80px]">${manualTotalCostWithTax.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">Total Profit:</span>
                <div className="flex gap-8">
                  <span className={`font-bold text-xl text-right min-w-[80px] ${gainIncrease > 0 ? 'text-green-600' : gainIncrease < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                    {gainIncrease > 0 ? '+' : ''}${gainIncrease.toFixed(2)}
                  </span>
                  {manualPriceEnabled && (
                    <span className={`font-bold text-xl text-right min-w-[80px] ${manualTotalProfit > 0 ? 'text-green-600' : manualTotalProfit < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                      {manualTotalProfit > 0 ? '+' : ''}${manualTotalProfit.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Profit Margin:</span>
                <div className="flex gap-8">
                  <span className={`text-sm font-semibold text-right min-w-[80px] ${profitMargin > 0 ? 'text-green-600' : profitMargin < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                  {manualPriceEnabled && (
                    <span className={`text-sm font-semibold text-right min-w-[80px] ${manualProfitMargin > 0 ? 'text-green-600' : manualProfitMargin < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                      {manualProfitMargin.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save / Clear Buttons */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!hasUnsavedChanges}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${hasUnsavedChanges ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}>
            <Save className="w-5 h-5" />
            {hasUnsavedChanges ? 'Save Calculator' : 'No Changes to Save'}
          </button>
          {onClear && (
            <button onClick={handleClear} disabled={isClearing}
              title="Clear the saved calculator for this collection"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold border-2 border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <X className="w-5 h-5" />
              {isClearing ? 'Clearing...' : 'Clear'}
            </button>
          )}
        </div>
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