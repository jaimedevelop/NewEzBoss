import React from 'react';
import { Sparkles, LayoutTemplate } from 'lucide-react';
import type { PricingTemplate } from '../../ClientPricingTemplates/types';
import { scopeLabel } from '../../ClientPricingTemplates/templateUtils';

interface TemplateSuggestionBannerProps {
    matched: PricingTemplate[];
    loading: boolean;
    onApplyTemplate: (t: PricingTemplate) => void;
    onOpenPicker: () => void;
}

/**
 * Renders contextual template suggestions above the pricing profiles list.
 *
 * - 0 matches  → renders nothing
 * - 1 match    → quiet single-template banner with a quick-apply button
 * - 2+ matches → pulsing "X templates available" call-to-action
 */
const TemplateSuggestionBanner: React.FC<TemplateSuggestionBannerProps> = ({
    matched, loading, onApplyTemplate, onOpenPicker,
}) => {
    if (loading || matched.length === 0) return null;

    if (matched.length === 1) {
        const t = matched[0];
        return (
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-800">Suggested template</p>
                    <p className="text-xs text-purple-600 truncate">
                        <span className="font-medium">{t.name}</span>
                        {t.tradeName && <span className="ml-1 opacity-75">· {scopeLabel(t)}</span>}
                    </p>
                </div>
                <button
                    onClick={() => onApplyTemplate(t)}
                    className="shrink-0 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                    Quick Apply
                </button>
            </div>
        );
    }

    // 2+ matches
    return (
        <button
            onClick={onOpenPicker}
            className="w-full flex items-center gap-3 bg-purple-50 border-2 border-purple-300 rounded-lg px-4 py-3
                       hover:bg-purple-100 hover:border-purple-400 transition-colors group
                       animate-pulse hover:animate-none"
        >
            <LayoutTemplate className="h-4 w-4 text-purple-500 shrink-0" />
            <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-purple-800 group-hover:text-purple-900">
                    {matched.length} templates available for this item
                </p>
                <p className="text-xs text-purple-500">Click to browse and apply one</p>
            </div>
            <span className="shrink-0 text-xs px-2.5 py-1 bg-purple-600 text-white rounded-full font-bold">
                {matched.length}
            </span>
        </button>
    );
};

export default TemplateSuggestionBanner;