// src/mobile/inventory/detailView/products/MobileGeneralTab.tsx
import React, { useState, useEffect, useRef } from 'react';
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
} from '../../../../services/categories';
import {
    ProductTrade,
    ProductSection,
    ProductCategory,
    ProductSubcategory,
    ProductType,
    ProductSize,
} from '../../../../services/categories/types';
import { addBrand } from '../../../../services/inventory/products/brands';
import { ChevronDown, Plus, Loader2 } from 'lucide-react';

interface MobileGeneralTabProps {
    disabled?: boolean;
}

// ─── Mobile Select Field ────────────────────────────────────────────────────

interface MobileSelectProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    onAddNew?: (name: string) => Promise<{ success: boolean; error?: string }>;
    loading?: boolean;
}

const MobileSelect: React.FC<MobileSelectProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder = 'Select...',
    disabled,
    required,
    error,
    onAddNew,
    loading,
}) => {
    const [showAdd, setShowAdd] = useState(false);
    const [addValue, setAddValue] = useState('');
    const [addError, setAddError] = useState('');
    const [adding, setAdding] = useState(false);

    const handleAdd = async () => {
        if (!addValue.trim() || !onAddNew) return;
        setAdding(true);
        setAddError('');
        const result = await onAddNew(addValue.trim());
        setAdding(false);
        if (result.success) {
            onChange(addValue.trim());
            setAddValue('');
            setShowAdd(false);
        } else {
            setAddError(result.error || 'Failed to add');
        }
    };

    return (
        <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            <div className="relative">
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    disabled={disabled || loading}
                    className={`w-full appearance-none bg-white border rounded-lg px-3 py-2.5 pr-10 text-sm
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
            ${error ? 'border-red-400' : 'border-gray-300'}
            ${disabled || loading ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'text-gray-900'}
          `}
                >
                    <option value="">{loading ? 'Loading...' : placeholder}</option>
                    {options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {loading
                        ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {onAddNew && !disabled && (
                <div>
                    {!showAdd ? (
                        <button
                            type="button"
                            onClick={() => setShowAdd(true)}
                            className="flex items-center gap-1 text-xs text-orange-600 font-medium mt-1"
                        >
                            <Plus className="w-3 h-3" /> Add new
                        </button>
                    ) : (
                        <div className="mt-1.5 flex gap-2">
                            <input
                                autoFocus
                                value={addValue}
                                onChange={e => setAddValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
                                placeholder={`New ${label.toLowerCase()}...`}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={adding || !addValue.trim()}
                                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowAdd(false); setAddValue(''); setAddError(''); }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
                </div>
            )}
        </div>
    );
};

// ─── Mobile Text Field ──────────────────────────────────────────────────────

interface MobileFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
    multiline?: boolean;
}

const MobileField: React.FC<MobileFieldProps> = ({
    label, value, onChange, placeholder, required, error, disabled, multiline,
}) => {
    const base = `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2
    focus:ring-orange-500 focus:border-transparent
    ${error ? 'border-red-400' : 'border-gray-300'}
    ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'}`;

    return (
        <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={e => !disabled && onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    disabled={disabled}
                    className={base}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={e => !disabled && onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={base}
                />
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
};

// ─── Main Tab ───────────────────────────────────────────────────────────────

const MobileGeneralTab: React.FC<MobileGeneralTabProps> = ({ disabled = false }) => {
    const { currentUser } = useAuthContext();
    const { state, updateField } = useProductCreation();
    const { formData } = state;

    const [globalError, setGlobalError] = useState('');
    const [trades, setTrades] = useState<ProductTrade[]>([]);
    const [sections, setSections] = useState<ProductSection[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
    const [types, setTypes] = useState<ProductType[]>([]);
    const [sizes, setSizes] = useState<ProductSize[]>([]);
    const [brands, setBrands] = useState<{ value: string; label: string }[]>([]);

    const [localTradeId, setLocalTradeId] = useState('');
    const [localSectionId, setLocalSectionId] = useState('');
    const [localCategoryId, setLocalCategoryId] = useState('');
    const [localSubcategoryId, setLocalSubcategoryId] = useState('');

    const [initialLoading, setInitialLoading] = useState(true);
    const [depLoading, setDepLoading] = useState(false);
    const initialLoadDone = useRef(false);

    useEffect(() => {
        if (!currentUser?.uid || initialLoadDone.current) return;

        const init = async () => {
            setInitialLoading(true);
            try {
                const result = await hierarchyLoader.loadCompleteHierarchy(
                    {
                        trade: formData.trade,
                        section: formData.section,
                        category: formData.category,
                        subcategory: formData.subcategory,
                        type: formData.type,
                    },
                    currentUser.uid
                );
                setTrades(result.tradesObjects || []);
                setBrands(result.brands);
                setSections(result.sections);
                setCategories(result.categories);
                setSubcategories(result.subcategories);
                setTypes(result.types);
                setSizes(result.sizes);
                setLocalTradeId(result.localIds.tradeId);
                setLocalSectionId(result.localIds.sectionId);
                setLocalCategoryId(result.localIds.categoryId);
                setLocalSubcategoryId(result.localIds.subcategoryId);
                initialLoadDone.current = true;
            } catch {
                setGlobalError('Failed to load product categories');
            } finally {
                setInitialLoading(false);
            }
        };

        init();
    }, [currentUser?.uid, formData.id]);

    // ── Cascading handlers (same logic as desktop GeneralTab) ──

    const handleTradeChange = async (value: string) => {
        if (disabled || !currentUser?.uid) return;
        updateField('trade', value);
        const trade = trades.find(t => t.name === value);
        const tradeId = trade?.id || '';
        setLocalTradeId(tradeId);
        ['section', 'category', 'subcategory', 'type', 'size'].forEach(f => updateField(f as any, ''));
        setLocalSectionId(''); setLocalCategoryId(''); setLocalSubcategoryId('');
        setCategories([]); setSubcategories([]); setTypes([]); setSizes([]);
        if (tradeId) {
            setDepLoading(true);
            try {
                const [sec, siz] = await Promise.all([
                    hierarchyLoader.loadDependentData('sections', tradeId, currentUser.uid),
                    hierarchyLoader.loadDependentData('sizes', tradeId, currentUser.uid),
                ]);
                setSections(sec as ProductSection[]);
                setSizes(siz as ProductSize[]);
            } finally { setDepLoading(false); }
        }
    };

    const handleSectionChange = async (value: string) => {
        if (disabled || !currentUser?.uid) return;
        updateField('section', value);
        const sec = sections.find(s => s.name === value);
        setLocalSectionId(sec?.id || '');
        ['category', 'subcategory', 'type'].forEach(f => updateField(f as any, ''));
        setLocalCategoryId(''); setLocalSubcategoryId('');
        setSubcategories([]); setTypes([]);
        if (sec?.id) {
            setDepLoading(true);
            try {
                const cats = await hierarchyLoader.loadDependentData('categories', sec.id, currentUser.uid);
                setCategories(cats as ProductCategory[]);
            } finally { setDepLoading(false); }
        }
    };

    const handleCategoryChange = async (value: string) => {
        if (disabled || !currentUser?.uid) return;
        updateField('category', value);
        const cat = categories.find(c => c.name === value);
        setLocalCategoryId(cat?.id || '');
        ['subcategory', 'type'].forEach(f => updateField(f as any, ''));
        setLocalSubcategoryId(''); setTypes([]);
        if (cat?.id) {
            setDepLoading(true);
            try {
                const subs = await hierarchyLoader.loadDependentData('subcategories', cat.id, currentUser.uid);
                setSubcategories(subs as ProductSubcategory[]);
            } finally { setDepLoading(false); }
        }
    };

    const handleSubcategoryChange = async (value: string) => {
        if (disabled || !currentUser?.uid) return;
        updateField('subcategory', value);
        const sub = subcategories.find(s => s.name === value);
        setLocalSubcategoryId(sub?.id || '');
        updateField('type', '');
        if (sub?.id) {
            setDepLoading(true);
            try {
                const typs = await hierarchyLoader.loadDependentData('types', sub.id, currentUser.uid);
                setTypes(typs as ProductType[]);
            } finally { setDepLoading(false); }
        }
    };

    // ── Add-new handlers ──

    const handleAddBrand = async (name: string) => {
        if (!currentUser?.uid || disabled) return { success: false, error: 'Not authenticated' };
        const res = await addBrand(name, currentUser.uid);
        if (res.success) {
            hierarchyLoader.clearCache();
            const r = await hierarchyLoader.loadCompleteHierarchy({}, currentUser.uid);
            setBrands(r.brands);
        }
        return res;
    };

    const handleAddTrade = async (name: string) => {
        if (!currentUser?.uid || disabled) return { success: false, error: 'Not authenticated' };
        const res = await addProductTrade(name, currentUser.uid);
        if (res.success) {
            hierarchyLoader.clearCache();
            const r = await hierarchyLoader.loadCompleteHierarchy({}, currentUser.uid);
            setTrades(r.tradesObjects || []);
        }
        return res;
    };

    const handleAddSection = async (name: string) => {
        if (!currentUser?.uid || disabled) return { success: false, error: 'Not authenticated' };
        if (!localTradeId) return { success: false, error: 'Select a trade first' };
        const res = await addProductSection(name, localTradeId, currentUser.uid);
        if (res.success) {
            hierarchyLoader.clearCacheForTrade(localTradeId);
            const sec = await hierarchyLoader.loadDependentData('sections', localTradeId, currentUser.uid);
            setSections(sec as ProductSection[]);
        }
        return res;
    };

    const handleAddCategory = async (name: string) => {
        if (!currentUser?.uid || disabled) return { success: false, error: 'Not authenticated' };
        if (!localSectionId) return { success: false, error: 'Select a section first' };
        const res = await addProductCategory(name, localSectionId, currentUser.uid);
        if (res.success) {
            const cats = await hierarchyLoader.loadDependentData('categories', localSectionId, currentUser.uid);
            setCategories(cats as ProductCategory[]);
        }
        return res;
    };

    const handleAddSubcategory = async (name: string) => {
        if (!currentUser?.uid || disabled) return { success: false, error: 'Not authenticated' };
        if (!localCategoryId) return { success: false, error: 'Select a category first' };
        const res = await addProductSubcategory(name, localCategoryId, currentUser.uid);
        if (res.success) {
            const subs = await hierarchyLoader.loadDependentData('subcategories', localCategoryId, currentUser.uid);
            setSubcategories(subs as ProductSubcategory[]);
        }
        return res;
    };

    const handleAddType = async (name: string) => {
        if (!currentUser?.uid || disabled) return { success: false, error: 'Not authenticated' };
        if (!localSubcategoryId) return { success: false, error: 'Select a subcategory first' };
        const res = await addProductType(name, localSubcategoryId, currentUser.uid);
        if (res.success) {
            const typs = await hierarchyLoader.loadDependentData('types', localSubcategoryId, currentUser.uid);
            setTypes(typs as ProductType[]);
        }
        return res;
    };

    const handleAddSize = async (name: string) => {
        if (!currentUser?.uid || disabled) return { success: false, error: 'Not authenticated' };
        if (!localTradeId) return { success: false, error: 'Select a trade first' };
        const res = await addProductSize(name, localTradeId, currentUser.uid);
        if (res.success) {
            const siz = await hierarchyLoader.loadDependentData('sizes', localTradeId, currentUser.uid);
            setSizes(siz as ProductSize[]);
        }
        return res;
    };

    // ── Render ──

    return (
        <div className="p-4 space-y-5">
            {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                    {globalError}
                </div>
            )}

            {/* Identity */}
            <section className="space-y-4">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identity</h2>
                <MobileField
                    label="Product Name"
                    value={formData.name}
                    onChange={v => updateField('name', v)}
                    placeholder="Enter product name"
                    required
                    error={formData.errors?.name}
                    disabled={disabled}
                />
                <MobileSelect
                    label="Brand"
                    value={formData.brand}
                    options={brands}
                    onChange={v => !disabled && updateField('brand', v)}
                    placeholder={initialLoading ? 'Loading...' : 'Select or add brand'}
                    disabled={disabled || initialLoading}
                    loading={initialLoading}
                    onAddNew={!disabled ? handleAddBrand : undefined}
                />
                <MobileField
                    label="Description"
                    value={formData.description}
                    onChange={v => updateField('description', v)}
                    placeholder="Enter product description"
                    error={formData.errors?.description}
                    disabled={disabled}
                    multiline
                />
            </section>

            {/* Category hierarchy */}
            <section className="space-y-4">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</h2>
                <MobileSelect
                    label="Trade"
                    value={formData.trade}
                    options={trades.map(t => ({ value: t.name, label: t.name }))}
                    onChange={handleTradeChange}
                    placeholder={initialLoading ? 'Loading...' : 'Select or add trade'}
                    required
                    error={formData.errors?.trade}
                    disabled={disabled || initialLoading}
                    loading={initialLoading}
                    onAddNew={!disabled ? handleAddTrade : undefined}
                />
                <MobileSelect
                    label="Section"
                    value={formData.section}
                    options={sections.map(s => ({ value: s.name, label: s.name }))}
                    onChange={handleSectionChange}
                    placeholder={!formData.trade ? 'Select trade first' : depLoading ? 'Loading...' : 'Select or add section'}
                    disabled={disabled || !formData.trade || depLoading || initialLoading}
                    loading={depLoading && !formData.section}
                    onAddNew={!disabled ? handleAddSection : undefined}
                />
                <MobileSelect
                    label="Category"
                    value={formData.category}
                    options={categories.map(c => ({ value: c.name, label: c.name }))}
                    onChange={handleCategoryChange}
                    placeholder={!formData.section ? 'Select section first' : depLoading ? 'Loading...' : 'Select or add category'}
                    disabled={disabled || !formData.section || depLoading || initialLoading}
                    loading={depLoading && !!formData.section && !formData.category}
                    onAddNew={!disabled ? handleAddCategory : undefined}
                />
                <MobileSelect
                    label="Subcategory"
                    value={formData.subcategory}
                    options={subcategories.map(s => ({ value: s.name, label: s.name }))}
                    onChange={handleSubcategoryChange}
                    placeholder={!formData.category ? 'Select category first' : depLoading ? 'Loading...' : 'Select or add subcategory'}
                    disabled={disabled || !formData.category || depLoading || initialLoading}
                    loading={depLoading && !!formData.category && !formData.subcategory}
                    onAddNew={!disabled ? handleAddSubcategory : undefined}
                />
                <MobileSelect
                    label="Type"
                    value={formData.type}
                    options={types.map(t => ({ value: t.name, label: t.name }))}
                    onChange={v => !disabled && updateField('type', v)}
                    placeholder={!formData.subcategory ? 'Select subcategory first' : depLoading ? 'Loading...' : 'Select or add type'}
                    disabled={disabled || !formData.subcategory || depLoading || initialLoading}
                    loading={depLoading && !!formData.subcategory && !formData.type}
                    onAddNew={!disabled ? handleAddType : undefined}
                />
                <MobileSelect
                    label="Size (Optional)"
                    value={formData.size || ''}
                    options={sizes.map(s => ({ value: s.name, label: s.name }))}
                    onChange={v => !disabled && updateField('size', v)}
                    placeholder={!formData.trade ? 'Select trade first' : 'Select or add size'}
                    disabled={disabled || !formData.trade || initialLoading}
                    onAddNew={!disabled ? handleAddSize : undefined}
                />
            </section>
        </div>
    );
};

export default MobileGeneralTab;