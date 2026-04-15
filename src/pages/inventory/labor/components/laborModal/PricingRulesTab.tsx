// src/pages/labor/components/laborModal/PricingRulesTab.tsx
import React, { useMemo } from 'react';
import { Plus, Trash2, TrendingUp, Star } from 'lucide-react';
import { useLaborCreation, type PricingProfileEntry } from '../../../../../contexts/LaborCreationContext';
import type { PricingStrategy, MeasurementUnit } from '../../../../../services/inventory/labor/labor.types';

interface PricingRulesTabProps {
    disabled?: boolean;
}

const STRATEGY_OPTIONS: { value: PricingStrategy; label: string; description: string }[] = [
    { value: 'flat', label: 'Flat Rate', description: 'Single fixed charge regardless of scope' },
    { value: 'tiered', label: 'Tiered', description: 'Minimum charge up to X units, then per-unit overage' },
    { value: 'measured', label: 'Measured', description: 'Charge per unit of measurement (sq ft, linear ft, etc.)' },
    { value: 'hourly_passthrough', label: 'Hourly Passthrough', description: 'Charge client based on actual hours at a set rate' },
];

const UNIT_OPTIONS: { value: MeasurementUnit; label: string }[] = [
    { value: 'hours', label: 'Hours' },
    { value: 'sqft', label: 'Square Feet (sq ft)' },
    { value: 'lnft', label: 'Linear Feet (ln ft)' },
    { value: 'each', label: 'Each / Unit' },
];

const STRATEGY_COLOR: Record<PricingStrategy, string> = {
    flat: 'blue',
    tiered: 'purple',
    measured: 'teal',
    hourly_passthrough: 'green',
};

function fmt(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function exampleCharge(p: PricingProfileEntry): string | null {
    const base = fmt(p.baseRate);
    if (base === null) return null;

    switch (p.strategy) {
        case 'flat':
            return `$${base.toFixed(2)} fixed`;
        case 'tiered': {
            const min = fmt(p.minimumCharge) ?? base;
            const incl = fmt(p.includedUnits);
            const over = fmt(p.overageRate);
            const unitLabel = UNIT_OPTIONS.find(u => u.value === p.unit)?.label || 'units';
            if (incl !== null && over !== null)
                return `$${min.toFixed(2)} for ≤${incl} ${unitLabel}, then +$${over.toFixed(2)}/${p.unit || 'unit'}`;
            return `$${min.toFixed(2)} minimum`;
        }
        case 'measured': {
            const min = fmt(p.minimumCharge);
            const unit = p.unit || 'unit';
            return min !== null
                ? `$${base.toFixed(2)}/${unit} (min $${min.toFixed(2)})`
                : `$${base.toFixed(2)}/${unit}`;
        }
        case 'hourly_passthrough':
            return `$${base.toFixed(2)}/hr billed to client`;
        default:
            return null;
    }
}

const PricingRulesTab: React.FC<PricingRulesTabProps> = ({ disabled = false }) => {
    const {
        state,
        addPricingProfileEntry,
        removePricingProfileEntry,
        updatePricingProfileEntry,
        setDefaultPricingProfile,
    } = useLaborCreation();

    const profiles = state.formData.pricingProfiles;

    const stats = useMemo(() => {
        const valid = profiles.filter(p => p.name && p.baseRate);
        const rates = valid.map(p => parseFloat(p.baseRate)).filter(n => !isNaN(n));
        return {
            count: valid.length,
            lowest: rates.length ? Math.min(...rates) : null,
            highest: rates.length ? Math.max(...rates) : null,
        };
    }, [profiles]);

    const needsUnit = (s: PricingStrategy) => s === 'measured' || s === 'tiered';
    const needsMin = (s: PricingStrategy) => s === 'measured';
    const needsIncl = (s: PricingStrategy) => s === 'tiered';
    const needsOver = (s: PricingStrategy) => s === 'tiered';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Pricing Rules</h3>
                    <p className="text-sm text-gray-500 mt-1">Define how this labor item is charged to the client</p>
                </div>
                {!disabled && (
                    <button
                        type="button"
                        onClick={addPricingProfileEntry}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Pricing Profile
                    </button>
                )}
            </div>

            {/* Stats bar */}
            {profiles.length > 0 && (
                <div className="bg-indigo-50 p-3 rounded-lg flex items-center space-x-6 text-sm">
                    <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-indigo-600 mr-1" />
                        <span className="text-gray-600">
                            <span className="font-medium text-indigo-600">{stats.count}</span> profile{stats.count !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {stats.lowest !== null && (
                        <span className="text-gray-600">
                            Base rate range:{' '}
                            <span className="font-medium text-indigo-600">${stats.lowest.toFixed(2)}</span>
                            {stats.highest !== stats.lowest && (
                                <> – <span className="font-medium text-indigo-600">${stats.highest!.toFixed(2)}</span></>
                            )}
                        </span>
                    )}
                </div>
            )}

            {/* Profile cards */}
            <div className="space-y-4">
                {profiles.map((profile, idx) => {
                    const color = STRATEGY_COLOR[profile.strategy];
                    const preview = exampleCharge(profile);

                    return (
                        <div
                            key={profile.id}
                            className={`border-2 rounded-lg p-4 space-y-4 ${profile.isDefault ? `border-${color}-400 bg-${color}-50` : 'border-gray-200 bg-white'
                                }`}
                        >
                            {/* Card header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className={`w-6 h-6 rounded-full bg-${color}-500 text-white text-xs font-bold flex items-center justify-center`}>
                                        {idx + 1}
                                    </span>
                                    {profile.isDefault && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                                            <Star className="w-3 h-3 mr-1" />
                                            Default
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    {!profile.isDefault && !disabled && (
                                        <button
                                            type="button"
                                            onClick={() => setDefaultPricingProfile(profile.id)}
                                            className="text-xs text-gray-500 hover:text-indigo-600 underline"
                                        >
                                            Set as default
                                        </button>
                                    )}
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => removePricingProfileEntry(profile.id)}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Row 1: Name + Strategy */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Profile Name</label>
                                    <input
                                        type="text"
                                        value={profile.name}
                                        onChange={e => updatePricingProfileEntry(profile.id, { name: e.target.value })}
                                        disabled={disabled}
                                        placeholder="e.g. Standard, Drywall per sq ft"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Pricing Strategy</label>
                                    <select
                                        value={profile.strategy}
                                        onChange={e => updatePricingProfileEntry(profile.id, {
                                            strategy: e.target.value as PricingStrategy,
                                            unit: '',
                                            minimumCharge: '',
                                            includedUnits: '',
                                            overageRate: '',
                                        })}
                                        disabled={disabled}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                                    >
                                        {STRATEGY_OPTIONS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {STRATEGY_OPTIONS.find(s => s.value === profile.strategy)?.description}
                                    </p>
                                </div>
                            </div>

                            {/* Row 2: Base Rate + Unit */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        {profile.strategy === 'flat' ? 'Flat Charge ($)' :
                                            profile.strategy === 'tiered' ? 'Base / Minimum Charge ($)' :
                                                profile.strategy === 'measured' ? `Rate per ${profile.unit || 'unit'} ($)` :
                                                    'Hourly Rate ($)'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={profile.baseRate}
                                            onChange={e => updatePricingProfileEntry(profile.id, { baseRate: e.target.value })}
                                            disabled={disabled}
                                            placeholder="0.00"
                                            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                                        />
                                    </div>
                                </div>

                                {needsUnit(profile.strategy) && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit of Measure</label>
                                        <select
                                            value={profile.unit}
                                            onChange={e => updatePricingProfileEntry(profile.id, { unit: e.target.value as MeasurementUnit })}
                                            disabled={disabled}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                                        >
                                            <option value="">Select unit...</option>
                                            {UNIT_OPTIONS.map(u => (
                                                <option key={u.value} value={u.value}>{u.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Row 3: Tiered / Measured extra fields */}
                            {(needsMin(profile.strategy) || needsIncl(profile.strategy) || needsOver(profile.strategy)) && (
                                <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-md border border-gray-100">
                                    {needsMin(profile.strategy) && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Charge ($)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={profile.minimumCharge}
                                                    onChange={e => updatePricingProfileEntry(profile.id, { minimumCharge: e.target.value })}
                                                    disabled={disabled}
                                                    placeholder="0.00"
                                                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {needsIncl(profile.strategy) && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Included {profile.unit ? UNIT_OPTIONS.find(u => u.value === profile.unit)?.label : 'Units'}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={profile.includedUnits}
                                                onChange={e => updatePricingProfileEntry(profile.id, { includedUnits: e.target.value })}
                                                disabled={disabled}
                                                placeholder="e.g. 4"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                            />
                                        </div>
                                    )}
                                    {needsOver(profile.strategy) && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Overage Rate ($ per {profile.unit || 'unit'})
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={profile.overageRate}
                                                    onChange={e => updatePricingProfileEntry(profile.id, { overageRate: e.target.value })}
                                                    disabled={disabled}
                                                    placeholder="0.00"
                                                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Preview */}
                            {preview && (
                                <div className={`text-xs px-3 py-2 rounded-md bg-${color}-100 text-${color}-800 font-medium`}>
                                    Preview: {preview}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty state */}
            {profiles.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                    <TrendingUp className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                    <div className="text-base font-medium">No pricing profiles yet</div>
                    <div className="text-sm mt-1 mb-4">
                        Add a profile to define how clients are charged for this labor item
                    </div>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={addPricingProfileEntry}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Pricing Profile
                        </button>
                    )}
                </div>
            )}

            {/* Info box */}
            {profiles.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-700">How pricing profiles work</p>
                    <p><span className="font-medium">Flat:</span> One fixed charge — e.g. $150 to install a toilet.</p>
                    <p><span className="font-medium">Tiered:</span> Minimum charge covers X units; additional units billed at overage rate — e.g. $200 for up to 4 hrs, then $50/hr.</p>
                    <p><span className="font-medium">Measured:</span> Charge per sq ft / linear ft / unit with an optional floor — e.g. $3.50/sq ft, minimum $200.</p>
                    <p><span className="font-medium">Hourly Passthrough:</span> Client is billed at a set hourly rate based on actual time.</p>
                    <p className="pt-1">The <span className="font-medium">default</span> profile is used automatically when this item is added to a collection or estimate.</p>
                </div>
            )}
        </div>
    );
};

export default PricingRulesTab;