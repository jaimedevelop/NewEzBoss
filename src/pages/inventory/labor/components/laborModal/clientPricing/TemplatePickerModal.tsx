import React, { useState, useMemo } from 'react';
import { X, Search, LayoutTemplate } from 'lucide-react';
import type { PricingTemplate } from '../../ClientPricingTemplates/types';
import { useHierarchy } from '../../ClientPricingTemplates/useHierarchy';
import { previewProfile, scopeLabel } from '../../ClientPricingTemplates/templateUtils';

interface TemplatePickerModalProps {
    userId: string;
    templates: PricingTemplate[];
    onSelect: (t: PricingTemplate) => void;
    onClose: () => void;
}

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';
const selDis = `${sel} disabled:bg-gray-50 disabled:text-gray-400`;

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
    userId, templates, onSelect, onClose,
}) => {
    const [search, setSearch] = useState('');
    const [filterTradeId, setFilterTradeId] = useState('');
    const [filterSectionId, setFilterSectionId] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('');

    const { trades, sections, categories } = useHierarchy(userId, filterTradeId, filterSectionId);

    const filtered = useMemo(() => {
        return templates.filter(t => {
            if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterTradeId && t.tradeId && t.tradeId !== filterTradeId) return false;
            if (filterSectionId && t.sectionId && t.sectionId !== filterSectionId) return false;
            if (filterCategoryId && t.categoryId && t.categoryId !== filterCategoryId) return false;
            return true;
        });
    }, [templates, search, filterTradeId, filterSectionId, filterCategoryId]);

    const clearFilters = () => {
        setSearch('');
        setFilterTradeId(''); setFilterSectionId(''); setFilterCategoryId('');
    };

    const hasFilters = search || filterTradeId || filterSectionId || filterCategoryId;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Select a Template</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Profiles will replace your current client pricing</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search + Filters */}
                <div className="p-4 border-b space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search templates…"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <select
                            value={filterTradeId}
                            onChange={e => {
                                setFilterTradeId(e.target.value);
                                setFilterSectionId(''); setFilterCategoryId('');
                            }}
                            className={sel}
                        >
                            <option value="">Any trade</option>
                            {trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select
                            value={filterSectionId}
                            onChange={e => { setFilterSectionId(e.target.value); setFilterCategoryId(''); }}
                            disabled={!filterTradeId}
                            className={selDis}
                        >
                            <option value="">{!filterTradeId ? 'Trade first' : 'Any section'}</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select
                            value={filterCategoryId}
                            onChange={e => setFilterCategoryId(e.target.value)}
                            disabled={!filterSectionId}
                            className={selDis}
                        >
                            <option value="">{!filterSectionId ? 'Section first' : 'Any category'}</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {hasFilters && (
                        <button onClick={clearFilters} className="text-xs text-purple-600 hover:underline">
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filtered.length === 0 ? (
                        <div className="text-center py-10">
                            <LayoutTemplate className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No templates match your filters</p>
                        </div>
                    ) : filtered.map(t => (
                        <button
                            key={t.id}
                            onClick={() => onSelect(t)}
                            className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-purple-400 hover:bg-purple-50 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <LayoutTemplate className="h-4 w-4 text-purple-400 shrink-0" />
                                <span className="font-medium text-gray-900 group-hover:text-purple-800 text-sm">{t.name}</span>
                                <span className="ml-auto text-xs text-gray-400">
                                    {t.profiles.length} profile{t.profiles.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            {t.tradeName && (
                                <p className="text-xs text-purple-500 mb-1">{scopeLabel(t)}</p>
                            )}
                            {t.description && (
                                <p className="text-xs text-gray-500 mb-1.5">{t.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1">
                                {t.profiles.map(p => (
                                    <span key={p.id} className={`text-xs px-1.5 py-0.5 rounded border
                                        ${p.isDefault
                                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                        {p.name}: {previewProfile(p)}
                                    </span>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TemplatePickerModal;