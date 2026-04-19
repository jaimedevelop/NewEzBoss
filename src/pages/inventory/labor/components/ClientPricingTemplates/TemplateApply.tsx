import React from 'react';
import { AlertCircle, CheckCircle2, Layers, LayoutTemplate } from 'lucide-react';
import type { PricingTemplate, ScopeLevel } from './index';
import HierarchySelector from './HierarchySelector';
import { useHierarchy } from './useHierarchy';
import { previewProfile, scopeLabel } from './templateUtils';

interface ApplyResult { updated: number; total: number; }

interface TemplateApplyProps {
    userId: string;
    template: PricingTemplate;
    level: ScopeLevel;
    tradeId: string;
    tradeName: string;
    sectionId: string;
    sectionName: string;
    categoryId: string;
    categoryName: string;
    applying: boolean;
    result: ApplyResult | null;
    onLevelChange: (l: ScopeLevel) => void;
    onTradeChange: (id: string, name: string) => void;
    onSectionChange: (id: string, name: string) => void;
    onCategoryChange: (id: string, name: string) => void;
    onApply: () => void;
    onBack: () => void;
}

const TemplateApply: React.FC<TemplateApplyProps> = ({
    userId, template,
    level, tradeId, tradeName, sectionId, sectionName, categoryId, categoryName,
    applying, result,
    onLevelChange, onTradeChange, onSectionChange, onCategoryChange,
    onApply, onBack,
}) => {
    const { trades, sections, categories } = useHierarchy(userId, tradeId, sectionId);

    const canApply = !!tradeId && (
        level === 'trade' ||
        (level === 'section' && !!sectionId) ||
        (level === 'category' && !!categoryId)
    );

    return (
        <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Template preview */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <LayoutTemplate className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-800">{template.name}</span>
                        {template.tradeName && (
                            <span className="text-xs text-purple-500 ml-auto">{scopeLabel(template)}</span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {template.profiles.map(p => (
                            <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full border
                                ${p.isDefault
                                    ? 'bg-purple-100 border-purple-400 text-purple-800'
                                    : 'bg-white border-purple-200 text-purple-600'}`}>
                                {p.name}: {previewProfile(p)}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Scope level */}
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Apply To</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['trade', 'section', 'category'] as ScopeLevel[]).map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => onLevelChange(lvl)}
                                className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors
                                    ${level === lvl
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            >
                                {lvl === 'trade' ? 'All in Trade' : lvl === 'section' ? 'All in Section' : 'All in Category'}
                            </button>
                        ))}
                    </div>
                </div>

                <HierarchySelector
                    trades={trades} sections={sections} categories={categories}
                    tradeId={tradeId} sectionId={sectionId} categoryId={categoryId}
                    onTradeChange={(id, n) => { onTradeChange(id, n); onSectionChange('', ''); onCategoryChange('', ''); }}
                    onSectionChange={(id, n) => { onSectionChange(id, n); onCategoryChange('', ''); }}
                    onCategoryChange={onCategoryChange}
                    required
                />

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        This will overwrite the existing client pricing profiles on all matching labor items.
                        This action cannot be undone.
                    </span>
                </div>

                {result && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Updated {result.updated} of {result.total} labor item{result.total !== 1 ? 's' : ''}.
                    </div>
                )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
                <button
                    onClick={onBack}
                    className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                    Back
                </button>
                <button
                    onClick={onApply}
                    disabled={!canApply || applying}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-60"
                >
                    <Layers className="h-4 w-4" />
                    {applying ? 'Applying…' : 'Apply Template'}
                </button>
            </div>
        </>
    );
};

export default TemplateApply;