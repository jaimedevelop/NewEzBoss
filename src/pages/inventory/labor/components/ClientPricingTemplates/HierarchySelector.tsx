import React from 'react';
import type { ProductTrade } from '../../../../../services/categories/trades';
import type { LaborSection, LaborCategory } from '../../../../../services/inventory/labor';

interface HierarchySelectorProps {
    trades: ProductTrade[];
    sections: LaborSection[];
    categories: LaborCategory[];
    tradeId: string;
    sectionId: string;
    categoryId: string;
    onTradeChange: (id: string, name: string) => void;
    onSectionChange: (id: string, name: string) => void;
    onCategoryChange: (id: string, name: string) => void;
    required?: boolean;
    cols?: 1 | 2 | 3;
}

const sel = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';
const selDis = `${sel} disabled:bg-gray-50 disabled:text-gray-400`;

const HierarchySelector: React.FC<HierarchySelectorProps> = ({
    trades, sections, categories,
    tradeId, sectionId, categoryId,
    onTradeChange, onSectionChange, onCategoryChange,
    required = false, cols = 3,
}) => {
    const gridClass =
        cols === 3 ? 'grid grid-cols-3 gap-3' :
            cols === 2 ? 'grid grid-cols-2 gap-3' :
                'grid grid-cols-1 gap-3';

    return (
        <div className={gridClass}>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Trade {required && <span className="text-red-500">*</span>}
                </label>
                <select
                    value={tradeId}
                    onChange={e => {
                        const t = trades.find(t => t.id === e.target.value);
                        onTradeChange(t?.id ?? '', t?.name ?? '');
                    }}
                    className={sel}
                >
                    <option value="">{required ? 'Select trade…' : 'Any trade'}</option>
                    {trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
                <select
                    value={sectionId}
                    onChange={e => {
                        const s = sections.find(s => s.id === e.target.value);
                        onSectionChange(s?.id ?? '', s?.name ?? '');
                    }}
                    disabled={!tradeId}
                    className={selDis}
                >
                    <option value="">{!tradeId ? 'Select trade first' : 'Any section'}</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                    value={categoryId}
                    onChange={e => {
                        const c = categories.find(c => c.id === e.target.value);
                        onCategoryChange(c?.id ?? '', c?.name ?? '');
                    }}
                    disabled={!sectionId}
                    className={selDis}
                >
                    <option value="">{!sectionId ? 'Select section first' : 'Any category'}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
        </div>
    );
};

export default HierarchySelector;