import React from 'react';
import { LayoutTemplate, Layers, Pencil, Trash2 } from 'lucide-react';
import type { PricingTemplate } from './types';
import { previewProfile, scopeLabel } from './templateUtils';

interface TemplateListProps {
    templates: PricingTemplate[];
    loading: boolean;
    onEdit: (t: PricingTemplate) => void;
    onDelete: (id: string) => void;
    onApply: (t: PricingTemplate) => void;
}

const TemplateList: React.FC<TemplateListProps> = ({ templates, loading, onEdit, onDelete, onApply }) => {
    if (loading) return <div className="text-center py-12 text-gray-400">Loading templates…</div>;

    if (templates.length === 0) return (
        <div className="text-center py-12">
            <LayoutTemplate className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No templates yet</p>
            <p className="text-sm text-gray-400 mt-1">
                Create a template to apply pricing rules across multiple labor items at once.
            </p>
        </div>
    );

    return (
        <div className="grid gap-3">
            {templates.map(t => (
                <div key={t.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <LayoutTemplate className="h-4 w-4 text-purple-500 shrink-0" />
                                <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full shrink-0">
                                    {t.profiles.length} profile{t.profiles.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            {t.description && <p className="text-sm text-gray-500 mb-1">{t.description}</p>}
                            {t.tradeName && (
                                <p className="text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded px-2 py-0.5 inline-block mb-2">
                                    {scopeLabel(t)}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                                {t.profiles.map(p => (
                                    <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full border
                                        ${p.isDefault
                                            ? 'bg-purple-50 border-purple-300 text-purple-700'
                                            : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        {p.name || 'Unnamed'}: {previewProfile(p)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => onApply(t)}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                            >
                                <Layers className="h-3.5 w-3.5" />Apply
                            </button>
                            <button
                                onClick={() => onEdit(t)}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onDelete(t.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TemplateList;