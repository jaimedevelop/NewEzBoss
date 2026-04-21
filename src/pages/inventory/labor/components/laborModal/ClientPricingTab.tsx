import React, { useState } from 'react';
import {
    Plus, Trash2, TrendingUp, Info,
    LayoutTemplate, AlertTriangle,
} from 'lucide-react';
import { useLaborCreation } from '../../../../../contexts/LaborCreationContext';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import type { PricingStrategy, MeasurementUnit } from '../../../../../services/inventory/labor/labor.types';
import type { PricingTemplate } from '../ClientPricingTemplates/types';
import TemplateSuggestionBanner from './clientPricing/TemplateSuggestionBanner';
import TemplatePickerModal from './clientPricing/TemplatePickerModal';
import { useTemplateRecommendations } from './clientPricing/useTemplateRecommendations';

// ─── Constants ────────────────────────────────────────────────────────────────

const STRATEGIES: { value: PricingStrategy; label: string; desc: string }[] = [
    { value: 'flat', label: 'Flat Rate', desc: 'Single fixed charge regardless of scope' },
    { value: 'tiered', label: 'Tiered', desc: 'Base price up to N units, overage after' },
    { value: 'measured', label: 'Measured', desc: 'Per sq ft, ln ft, or other unit' },
    { value: 'hourly_passthrough', label: 'Hourly Passthrough', desc: 'Pass through labour hours at a set rate' },
];

const UNITS: { value: MeasurementUnit; label: string }[] = [
    { value: 'sqft', label: 'Sq Ft' },
    { value: 'lnft', label: 'Ln Ft' },
    { value: 'each', label: 'Each' },
    { value: 'hours', label: 'Hours' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ProfileEntry = ReturnType<typeof useLaborCreation>['state']['formData']['pricingProfiles'][0];

function previewProfile(p: ProfileEntry): string {
    const n = parseFloat(p.baseRate);
    if (!n) return '—';
    const fmt = (v: number) => `$${v.toLocaleString()}`;
    const unitLabel = UNITS.find(u => u.value === p.unit)?.label ?? 'unit';
    switch (p.strategy) {
        case 'flat': return `${fmt(n)} flat`;
        case 'tiered': {
            const inc = parseFloat(p.includedUnits ?? '');
            const ov = parseFloat(p.overageRate ?? '');
            return inc && ov
                ? `${fmt(n)} for ≤${inc} ${unitLabel}, then +${fmt(ov)}/${unitLabel}` : '—';
        }
        case 'measured': {
            const min = parseFloat(p.minimumCharge ?? '');
            return `${fmt(n)}/${unitLabel}${min ? ` (min ${fmt(min)})` : ''}`;
        }
        case 'hourly_passthrough': return `${fmt(n)}/hr`;
        default: return '—';
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

interface ClientPricingTabProps {
    disabled?: boolean;
    onNavigateToGeneral?: () => void;
    hasGeneralErrors?: boolean;
}

const ClientPricingTab: React.FC<ClientPricingTabProps> = ({
    disabled,
    onNavigateToGeneral,
    hasGeneralErrors = false,
}) => {
    const {
        state,
        addPricingProfileEntry, removePricingProfileEntry,
        updatePricingProfileEntry, setDefaultPricingProfile,
        setPricingProfiles,
    } = useLaborCreation();
    const { formData } = state;
    const { currentUser } = useAuthContext();

    const [showPicker, setShowPicker] = useState(false);

    const hasHierarchy = !!(formData.tradeId && formData.sectionId && formData.categoryId);

    const { templates, matched, loading: templatesLoading } = useTemplateRecommendations(
        currentUser?.uid,
        {
            tradeId: formData.tradeId ?? '',
            sectionId: formData.sectionId ?? '',
            categoryId: formData.categoryId ?? '',
        },
    );

    const applyTemplate = (t: PricingTemplate) => {
        setPricingProfiles(t.profiles.map(p => ({
            id: p.id,
            name: p.name,
            strategy: p.strategy,
            unit: p.unit ?? '',
            baseRate: String(p.baseRate),
            minimumCharge: p.minimumCharge != null ? String(p.minimumCharge) : '',
            includedUnits: p.includedUnits != null ? String(p.includedUnits) : '',
            overageRate: p.overageRate != null ? String(p.overageRate) : '',
            isDefault: p.isDefault ?? false,
        })));
        setShowPicker(false);
    };

    const profiles = formData.pricingProfiles;
    const profileRates = profiles.map(p => parseFloat(p.baseRate)).filter(Boolean);
    const minProfile = profileRates.length ? Math.min(...profileRates) : null;
    const maxProfile = profileRates.length ? Math.max(...profileRates) : null;

    return (
        <div className="space-y-6 p-4">

            {/* ── Missing hierarchy warning ──────────────────────────────── */}
            {hasGeneralErrors && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                        Some required fields in the General tab are incomplete. Templates will still
                        load and can be browsed, but you must complete the General tab before saving.{' '}
                        {onNavigateToGeneral && (
                            <button
                                type="button"
                                onClick={onNavigateToGeneral}
                                className="underline font-semibold hover:opacity-75 transition-opacity"
                            >
                                Go to General tab
                            </button>
                        )}
                    </span>
                </div>
            )}

            {/* ── Advanced Pricing Rules ────────────────────────────────── */}
            <div className="border-2 border-indigo-100 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    <div>
                        <h3 className="font-semibold text-gray-800">Advanced Pricing Rules</h3>
                        <p className="text-xs text-gray-500">Client-facing pricing profiles shown on estimates</p>
                    </div>
                </div>

                <TemplateSuggestionBanner
                    matched={matched}
                    loading={templatesLoading}
                    onApplyTemplate={applyTemplate}
                    onOpenPicker={() => setShowPicker(true)}
                />

                <div className="flex gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                        <strong>Strategy guide:</strong> Flat — fixed fee. Tiered — base covers N units, overage after.
                        Measured — per sq ft / ln ft / etc. Hourly Passthrough — billable hours at a set rate.
                        Mark one profile as <em>Default</em> to pre-select it on estimates.
                    </div>
                </div>

                {profiles.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No pricing profiles yet</p>
                        <p className="text-xs text-gray-400 mt-0.5">Add one below or load a template</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {profiles.map((p, idx) => {
                            const showUnit = p.strategy === 'tiered' || p.strategy === 'measured';
                            const showIncluded = p.strategy === 'tiered';
                            const showOverage = p.strategy === 'tiered';
                            const showMinimum = p.strategy === 'measured';
                            const baseLabel = p.strategy === 'hourly_passthrough' ? 'Hourly Rate ($)' : 'Base Rate ($)';
                            const preview = previewProfile(p);

                            return (
                                <div key={p.id} className={`border-2 rounded-lg p-4 ${p.isDefault ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            {p.isDefault && (
                                                <span className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded-full font-medium">Default</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {!p.isDefault && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDefaultPricingProfile(p.id)}
                                                    className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                                >
                                                    Set Default
                                                </button>
                                            )}
                                            {profiles.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removePricingProfileEntry(p.id)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Profile Name</label>
                                            <input
                                                value={p.name}
                                                onChange={e => updatePricingProfileEntry(p.id, 'name', e.target.value)}
                                                placeholder="e.g. Standard, Premium"
                                                className={inp}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Strategy</label>
                                            <select
                                                value={p.strategy}
                                                onChange={e => updatePricingProfileEntry(p.id, 'strategy', e.target.value as PricingStrategy)}
                                                className={inp}
                                            >
                                                {STRATEGIES.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">{baseLabel}</label>
                                            <input
                                                type="number" min={0}
                                                value={p.baseRate}
                                                onChange={e => updatePricingProfileEntry(p.id, 'baseRate', e.target.value)}
                                                placeholder="0.00"
                                                className={inp}
                                            />
                                        </div>
                                        {showUnit && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                                                <select
                                                    value={p.unit ?? ''}
                                                    onChange={e => updatePricingProfileEntry(p.id, 'unit', e.target.value as MeasurementUnit)}
                                                    className={inp}
                                                >
                                                    <option value="">Select unit</option>
                                                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {showIncluded && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Included Units</label>
                                                <input
                                                    type="number" min={0}
                                                    value={p.includedUnits ?? ''}
                                                    onChange={e => updatePricingProfileEntry(p.id, 'includedUnits', e.target.value)}
                                                    placeholder="e.g. 4"
                                                    className={inp}
                                                />
                                            </div>
                                        )}
                                        {showOverage && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Overage Rate ($)</label>
                                                <input
                                                    type="number" min={0}
                                                    value={p.overageRate ?? ''}
                                                    onChange={e => updatePricingProfileEntry(p.id, 'overageRate', e.target.value)}
                                                    placeholder="0.00"
                                                    className={inp}
                                                />
                                            </div>
                                        )}
                                        {showMinimum && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Charge ($)</label>
                                                <input
                                                    type="number" min={0}
                                                    value={p.minimumCharge ?? ''}
                                                    onChange={e => updatePricingProfileEntry(p.id, 'minimumCharge', e.target.value)}
                                                    placeholder="0.00"
                                                    className={inp}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {preview !== '—' && (
                                        <p className="mt-3 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-3 py-1.5 font-medium">
                                            Preview: {preview}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Bottom action row ─────────────────────────────────── */}
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={addPricingProfileEntry}
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            <Plus className="h-4 w-4" />Add Pricing Profile
                        </button>
                        <span className="text-gray-300 select-none">|</span>
                        <button
                            type="button"
                            onClick={() => setShowPicker(true)}
                            className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                            <LayoutTemplate className="h-4 w-4" />Use Template
                        </button>
                    </div>

                    {profileRates.length > 1 && (
                        <div className="flex gap-3 text-xs text-indigo-600">
                            <span>Low: <strong>${minProfile?.toLocaleString()}</strong></span>
                            <span>High: <strong>${maxProfile?.toLocaleString()}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {showPicker && currentUser && (
                <TemplatePickerModal
                    userId={currentUser.uid}
                    templates={templates}
                    onSelect={applyTemplate}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};

export default ClientPricingTab;