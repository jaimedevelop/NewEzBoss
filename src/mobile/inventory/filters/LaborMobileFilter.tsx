// src/mobile/inventory/filters/LaborMobileFilter.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { Dropdown } from '../../../mainComponents/forms/Dropdown';
import { Select } from '../../../mainComponents/forms/Select';
import { getProductTrades } from '../../../services/categories/trades';
import {
    getSections,
    getCategories,
    type LaborSection,
    type LaborCategory
} from '../../../services/inventory/labor';

const tierOptions = [
    { value: '', label: 'All Tiers' },
    { value: 'Collection', label: 'Collection' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Plus', label: 'Plus' },
    { value: 'Premium', label: 'Premium' },
    { value: 'Standard', label: 'Standard' },
    { value: 'Tier 1', label: 'Tier 1' },
    { value: 'Tier 2', label: 'Tier 2' },
    { value: 'Tier 3', label: 'Tier 3' },
    { value: 'Tier 4', label: 'Tier 4' },
    { value: 'Tier 5', label: 'Tier 5' },
    { value: 'Tier 6', label: 'Tier 6' }
];

const sortOptions = [
    { value: 'name', label: 'Sort by Name' },
    { value: 'tradeName', label: 'Trade' },
    { value: 'sectionName', label: 'Section' },
    { value: 'categoryName', label: 'Category' },
    { value: 'createdAt', label: 'Date Created' }
];

export interface LaborFilterState {
    searchTerm: string;
    tradeId: string;
    sectionId: string;
    categoryId: string;
    tier: string;
    sortBy: string;
}

interface LaborMobileFilterProps {
    filterState: LaborFilterState;
    onFilterChange: (filterState: LaborFilterState) => void;
}

const LaborMobileFilter: React.FC<LaborMobileFilterProps> = ({
    filterState,
    onFilterChange
}) => {
    const { currentUser } = useAuthContext();

    const [tradeOptions, setTradeOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [sections, setSections] = useState<LaborSection[]>([]);
    const [categories, setCategories] = useState<LaborCategory[]>([]);

    const sectionOptions = useMemo(
        () => [...sections].sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ value: s.id!, label: s.name })),
        [sections]
    );
    const categoryOptions = useMemo(
        () => [...categories].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ value: c.id!, label: c.name })),
        [categories]
    );

    useEffect(() => {
        if (!currentUser?.uid) return;
        getProductTrades(currentUser.uid).then(result => {
            if (result.success && result.data)
                setTradeOptions(
                    [...result.data]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(t => ({ value: t.id!, label: t.name }))
                );
        });
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.tradeId) { setSections([]); return; }
        getSections(filterState.tradeId, currentUser.uid).then(result => {
            setSections(result.success && result.data ? result.data : []);
        });
    }, [currentUser?.uid, filterState.tradeId]);

    useEffect(() => {
        if (!currentUser?.uid || !filterState.sectionId) { setCategories([]); return; }
        getCategories(filterState.sectionId, currentUser.uid).then(result => {
            setCategories(result.success && result.data ? result.data : []);
        });
    }, [currentUser?.uid, filterState.sectionId]);

    const handleChange = (field: keyof LaborFilterState, value: string) => {
        const next = { ...filterState, [field]: value };
        if (field === 'tradeId') {
            next.sectionId = '';
            next.categoryId = '';
        } else if (field === 'sectionId') {
            next.categoryId = '';
        }
        onFilterChange(next);
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Trade</label>
                <Dropdown
                    color="purple"
                    value={filterState.tradeId}
                    onChange={val => handleChange('tradeId', val)}
                    options={[{ value: '', label: 'All Trades' }, ...tradeOptions]}
                    placeholder="All Trades"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
                <Dropdown
                    color="purple"
                    value={filterState.sectionId}
                    onChange={val => handleChange('sectionId', val)}
                    options={[{ value: '', label: 'All Sections' }, ...sectionOptions]}
                    placeholder="All Sections"
                    disabled={!filterState.tradeId}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <Dropdown
                    color="purple"
                    value={filterState.categoryId}
                    onChange={val => handleChange('categoryId', val)}
                    options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
                    placeholder="All Categories"
                    disabled={!filterState.sectionId}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tier</label>
                <Select
                    value={filterState.tier}
                    onChange={val => handleChange('tier', val)}
                    options={tierOptions}
                    placeholder="All Tiers"
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

export default LaborMobileFilter;