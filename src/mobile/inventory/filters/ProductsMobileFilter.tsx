// src/mobile/inventory/filters/ProductsMobileFilter.tsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { Dropdown } from '../../../mainComponents/forms/Dropdown';
import { Select } from '../../../mainComponents/forms/Select';
import {
    getProductTrades,
    getProductSections,
    getProductCategories,
    getProductSubcategories,
    getProductTypes,
    getProductSizes
} from '../../../services/categories';

const stockOptions = [
    { value: '', label: 'All Stock Levels' },
    { value: 'in', label: 'In Stock' },
    { value: 'low', label: 'Low Stock' },
    { value: 'out', label: 'Out of Stock' }
];

const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'trade', label: 'Sort by Trade' },
    { value: 'unitPrice', label: 'Sort by Price' },
    { value: 'onHand', label: 'Sort by Stock' }
];

interface FilterState {
    searchTerm: string;
    tradeFilter: string;
    sectionFilter: string;
    categoryFilter: string;
    subcategoryFilter: string;
    typeFilter: string;
    sizeFilter: string;
    stockFilter: string;
    locationFilter: string;
    sortBy: string;
}

interface ProductsMobileFilterProps {
    filterState: FilterState;
    onFilterChange: (filterState: FilterState) => void;
}

const ProductsMobileFilter: React.FC<ProductsMobileFilterProps> = ({
    filterState,
    onFilterChange
}) => {
    const { currentUser } = useAuthContext();

    const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [subcategoryOptions, setSubcategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [sizeOptions, setSizeOptions] = useState<Array<{ value: string; label: string }>>([]);

    useEffect(() => {
        if (!currentUser?.uid) return;
        getProductTrades(currentUser.uid).then(result => {
            if (result.success && result.data)
                setTradeOptions(result.data.map(t => ({ value: t.id!, label: t.name })));
        });
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.tradeFilter) { setSectionOptions([]); return; }
        getProductSections(filterState.tradeFilter, currentUser.uid).then(result => {
            if (result.success && result.data)
                setSectionOptions(result.data.map(s => ({ value: s.id!, label: s.name })));
            else setSectionOptions([]);
        });
    }, [currentUser?.uid, filterState.tradeFilter]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.sectionFilter) { setCategoryOptions([]); return; }
        getProductCategories(filterState.sectionFilter, currentUser.uid).then(result => {
            if (result.success && result.data)
                setCategoryOptions(result.data.map(c => ({ value: c.id!, label: c.name })));
            else setCategoryOptions([]);
        });
    }, [currentUser?.uid, filterState.sectionFilter]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.categoryFilter) { setSubcategoryOptions([]); return; }
        getProductSubcategories(filterState.categoryFilter, currentUser.uid).then(result => {
            if (result.success && result.data)
                setSubcategoryOptions(result.data.map(sc => ({ value: sc.id!, label: sc.name })));
            else setSubcategoryOptions([]);
        });
    }, [currentUser?.uid, filterState.categoryFilter]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.subcategoryFilter) { setTypeOptions([]); return; }
        getProductTypes(filterState.subcategoryFilter, currentUser.uid).then(result => {
            if (result.success && result.data)
                setTypeOptions(result.data.map(t => ({ value: t.id!, label: t.name })));
            else setTypeOptions([]);
        });
    }, [currentUser?.uid, filterState.subcategoryFilter]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.tradeFilter) { setSizeOptions([]); return; }
        getProductSizes(currentUser.uid, filterState.tradeFilter).then(result => {
            if (result.success && result.data)
                setSizeOptions(result.data.map(s => ({ value: s.id!, label: s.name })));
            else setSizeOptions([]);
        });
    }, [currentUser?.uid, filterState.tradeFilter]);

    const handleChange = (field: keyof FilterState, value: string) => {
        const next = { ...filterState, [field]: value };
        if (field === 'tradeFilter') {
            next.sectionFilter = '';
            next.categoryFilter = '';
            next.subcategoryFilter = '';
            next.typeFilter = '';
            next.sizeFilter = '';
        } else if (field === 'sectionFilter') {
            next.categoryFilter = '';
            next.subcategoryFilter = '';
            next.typeFilter = '';
        } else if (field === 'categoryFilter') {
            next.subcategoryFilter = '';
            next.typeFilter = '';
        } else if (field === 'subcategoryFilter') {
            next.typeFilter = '';
        }
        onFilterChange(next);
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Trade</label>
                <Dropdown
                    color="orange"
                    value={filterState.tradeFilter}
                    onChange={val => handleChange('tradeFilter', val)}
                    options={[{ value: '', label: 'All Trades' }, ...tradeOptions]}
                    placeholder="All Trades"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
                <Dropdown
                    color="orange"
                    value={filterState.sectionFilter}
                    onChange={val => handleChange('sectionFilter', val)}
                    options={[{ value: '', label: 'All Sections' }, ...sectionOptions]}
                    placeholder="All Sections"
                    disabled={!filterState.tradeFilter}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <Dropdown
                    color="orange"
                    value={filterState.categoryFilter}
                    onChange={val => handleChange('categoryFilter', val)}
                    options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
                    placeholder="All Categories"
                    disabled={!filterState.sectionFilter}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subcategory</label>
                <Dropdown
                    color="orange"
                    value={filterState.subcategoryFilter}
                    onChange={val => handleChange('subcategoryFilter', val)}
                    options={[{ value: '', label: 'All Subcategories' }, ...subcategoryOptions]}
                    placeholder="All Subcategories"
                    disabled={!filterState.categoryFilter}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <Dropdown
                    color="orange"
                    value={filterState.typeFilter}
                    onChange={val => handleChange('typeFilter', val)}
                    options={[{ value: '', label: 'All Types' }, ...typeOptions]}
                    placeholder="All Types"
                    disabled={!filterState.subcategoryFilter}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                <Dropdown
                    color="orange"
                    value={filterState.sizeFilter}
                    onChange={val => handleChange('sizeFilter', val)}
                    options={[{ value: '', label: 'All Sizes' }, ...sizeOptions]}
                    placeholder="All Sizes"
                    disabled={!filterState.tradeFilter}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Stock Level</label>
                <Select
                    value={filterState.stockFilter}
                    onChange={val => handleChange('stockFilter', val)}
                    options={stockOptions}
                    placeholder="All Stock Levels"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                <Select
                    value={filterState.sortBy}
                    onChange={val => handleChange('sortBy', val)}
                    options={sortOptions}
                    placeholder="Sort By..."
                />
            </div>
        </div>
    );
};

export default ProductsMobileFilter;