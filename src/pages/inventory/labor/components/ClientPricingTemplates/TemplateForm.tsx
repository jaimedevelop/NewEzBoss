import React from 'react';
import { Plus, Save } from 'lucide-react';
import type { PricingProfile } from '../../../../../services/inventory/labor/labor.types';
import ProfileCard from './ProfileCard';
import HierarchySelector from './HierarchySelector';
import { useHierarchy } from './useHierarchy';
import { blankProfile, scopeLabel } from './templateUtils';

interface TemplateFormProps {
    userId: string;
    mode: 'create' | 'edit';
    name: string;
    desc: string;
    profiles: PricingProfile[];
    tradeId: string;
    tradeName: string;
    sectionId: string;
    sectionName: string;
    categoryId: string;
    categoryName: string;
    saving: boolean;
    onNameChange: (v: string) => void;
    onDescChange: (v: string) => void;
    onProfilesChange: (p: PricingProfile[]) => void;
    onTradeChange: (id: string, name: string) => void;
    onSectionChange: (id: string, name: string) => void;
    onCategoryChange: (id: string, name: string) => void;
    onSave: () => void;
    onBack: () => void;
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';

const TemplateForm: React.FC<TemplateFormProps> = ({
    userId, mode,
    name, desc, profiles,
    tradeId, tradeName, sectionId, sectionName, categoryId, categoryName,
    saving,
    onNameChange, onDescChange, onProfilesChange,
    onTradeChange, onSectionChange, onCategoryChange,
    onSave, onBack,
}) => {
    const { trades, sections, categories } = useHierarchy(userId, tradeId, sectionId);

    const updateProfile = (idx: number, field: keyof PricingProfile, val: any) =>
        onProfilesChange(profiles.map((p, i) => i === idx ? { ...p, [field]: val } : p));

    const setDefault = (idx: number) =>
        onProfilesChange(profiles.map((p, i) => ({ ...p, isDefault: i === idx })));

    const removeProfile = (idx: number) => {
        const next = profiles.filter((_, i) => i !== idx);
        if (!next.some(p => p.isDefault) && next.length) next[0] = { ...next[0], isDefault: true };
        onProfilesChange(next);
    };

    const addProfile = () =>
        onProfilesChange([...profiles, blankProfile()]);

    return (
        <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Meta */}
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Template Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={e => onNameChange(e.target.value)}
                            placeholder="e.g. Drywall Standard Pricing"
                            className={inp}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            value={desc}
                            onChange={e => onDescChange(e.target.value)}
                            placeholder="Optional — describe what this template is for"
                            className={inp}
                        />
                    </div>
                </div>

                {/* Scope */}
                <div className="border border-purple-100 bg-purple-50 rounded-lg p-4 space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold text-purple-800">Template Scope</h3>
                        <p className="text-xs text-purple-600 mt-0.5">
                            Tag this template to a trade, section, or category so it can be suggested when editing
                            labor items in that area. All fields are optional.
                        </p>
                    </div>
                    <HierarchySelector
                        trades={trades} sections={sections} categories={categories}
                        tradeId={tradeId} sectionId={sectionId} categoryId={categoryId}
                        onTradeChange={(id, n) => { onTradeChange(id, n); onSectionChange('', ''); onCategoryChange('', ''); }}
                        onSectionChange={(id, n) => { onSectionChange(id, n); onCategoryChange('', ''); }}
                        onCategoryChange={onCategoryChange}
                    />
                    {tradeName && (
                        <p className="text-xs text-purple-700 font-medium">
                            Scope: {scopeLabel({ tradeName, sectionName: sectionName || undefined, categoryName: categoryName || undefined })}
                        </p>
                    )}
                </div>

                {/* Profiles */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800">Pricing Profiles</h3>
                            <p className="text-xs text-gray-500">The default profile will be pre-selected when applying</p>
                        </div>
                        <button
                            onClick={addProfile}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                            <Plus className="h-3.5 w-3.5" />Add Profile
                        </button>
                    </div>
                    <div className="space-y-3">
                        {profiles.map((p, i) => (
                            <ProfileCard
                                key={p.id} profile={p} index={i}
                                onChange={(field, val) => updateProfile(i, field, val)}
                                onRemove={() => removeProfile(i)}
                                onSetDefault={() => setDefault(i)}
                                isOnly={profiles.length === 1}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
                <button
                    onClick={onBack}
                    className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                    Back
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Template'}
                </button>
            </div>
        </>
    );
};

export default TemplateForm;