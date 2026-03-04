// src/mobile/inventory/filters/ToolsMobileFilter.tsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { Dropdown } from '../../../mainComponents/forms/Dropdown';
import { Select } from '../../../mainComponents/forms/Select';
import { getProductTrades } from '../../../services/categories';
import {
    getToolSections,
    getToolCategories,
    getToolSubcategories
} from '../../../services/inventory/tools';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'available', label: 'Available' },
    { value: 'in-use', label: 'In Use' },
    { value: 'maintenance', label: 'Maintenance' }
];

const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'brand', label: 'Sort by Brand' },
    { value: 'status', label: 'Sort by Status' }
];

interface FilterState {
    searchTerm: string;
    tradeFilter: string;
    sectionFilter: string;
    categoryFilter: string;
    subcategoryFilter: string;
    statusFilter: string;
    sortBy: string;
}

interface ToolsMobileFilterProps {
    filterState: FilterState;
    onFilterChange: (filterState: FilterState) => void;
}

const ToolsMobileFilter: React.FC<ToolsMobileFilterProps> = ({
    filterState,
    onFilterChange
}) => {
    const { currentUser } = useAuthContext();

    const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [sectionOptions, setSectionOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [subcategoryOptions, setSubcategoryOptions] = useState<Array<{ value: string; label: string }>>([]);

    useEffect(() => {
        if (!currentUser?.uid) return;
        getProductTrades(currentUser.uid).then(result => {
            if (result.success && result.data)
                setTradeOptions(result.data.map(t => ({ value: t.id || '', label: t.name })));
        });
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.tradeFilter) { setSectionOptions([]); return; }
        getToolSections(filterState.tradeFilter, currentUser.uid).then(result => {
            setSectionOptions(result.success && result.data ? result.data.map(s => ({ value: s.id || '', label: s.name })) : []);
        });
    }, [currentUser?.uid, filterState.tradeFilter]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.sectionFilter) { setCategoryOptions([]); return; }
        getToolCategories(filterState.sectionFilter, currentUser.uid).then(result => {
            setCategoryOptions(result.success && result.data ? result.data.map(c => ({ value: c.id || '', label: c.name })) : []);
        });
    }, [currentUser?.uid, filterState.sectionFilter]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.categoryFilter) { setSubcategoryOptions([]); return; }
        getToolSubcategories(filterState.categoryFilter, currentUser.uid).then(result => {
            setSubcategoryOptions(result.success && result.data ? result.data.map(sc => ({ value: sc.id || '', label: sc.name })) : []);
        });
    }, [currentUser?.uid, filterState.categoryFilter]);

    const handleChange = (field: keyof FilterState, value: string) => {
        const next = { ...filterState, [field]: value };
        if (field === 'tradeFilter') {
            next.sectionFilter = '';
            next.categoryFilter = '';
            next.subcategoryFilter = '';
        } else if (field === 'sectionFilter') {
            next.categoryFilter = '';
            next.subcategoryFilter = '';
        } else if (field === 'categoryFilter') {
            next.subcategoryFilter = '';
        }
        onFilterChange(next);
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Trade</label>
                <Dropdown
                    color="blue"
                    value={filterState.tradeFilter}
                    onChange={val => handleChange('tradeFilter', val)}
                    options={[{ value: '', label: 'All Trades' }, ...tradeOptions]}
                    placeholder="All Trades"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
                <Dropdown
                    color="blue"
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
                    color="blue"
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
                    color="blue"
                    value={filterState.subcategoryFilter}
                    onChange={val => handleChange('subcategoryFilter', val)}
                    options={[{ value: '', label: 'All Subcategories' }, ...subcategoryOptions]}
                    placeholder="All Subcategories"
                    disabled={!filterState.categoryFilter}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <Select
                    value={filterState.statusFilter}
                    onChange={val => handleChange('statusFilter', val)}
                    options={statusOptions}
                    placeholder="All Statuses"
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

export default ToolsMobileFilter;