import React from 'react';
import { Trash2 } from 'lucide-react';
import type { PricingProfile, MeasurementUnit, PricingStrategy } from '../../../../../services/inventory/labor/labor.types';
import { STRATEGIES, UNITS, previewProfile } from './templateUtils';

interface ProfileCardProps {
    profile: PricingProfile;
    index: number;
    onChange: (field: keyof PricingProfile, val: any) => void;
    onRemove: () => void;
    onSetDefault: () => void;
    isOnly: boolean;
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';

const ProfileCard: React.FC<ProfileCardProps> = ({
    profile, index, onChange, onRemove, onSetDefault, isOnly,
}) => {
    const showUnit = profile.strategy === 'tiered' || profile.strategy === 'measured';
    const showIncluded = profile.strategy === 'tiered';
    const showOverage = profile.strategy === 'tiered';
    const showMinimum = profile.strategy === 'measured';
    const baseLabel = profile.strategy === 'hourly_passthrough' ? 'Hourly Rate ($)' : 'Base Rate ($)';

    return (
        <div className={`border-2 rounded-lg p-4 ${profile.isDefault ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                    </span>
                    {profile.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-purple-600 text-white rounded-full font-medium">Default</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {!profile.isDefault && (
                        <button onClick={onSetDefault} className="text-xs px-2 py-1 text-purple-600 hover:bg-purple-100 rounded transition-colors">
                            Set Default
                        </button>
                    )}
                    {!isOnly && (
                        <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Profile Name</label>
                    <input
                        value={profile.name}
                        onChange={e => onChange('name', e.target.value)}
                        placeholder="e.g. Standard, Premium"
                        className={inp}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Strategy</label>
                    <select
                        value={profile.strategy}
                        onChange={e => onChange('strategy', e.target.value as PricingStrategy)}
                        className={inp}
                    >
                        {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{baseLabel}</label>
                    <input
                        type="number" min={0}
                        value={profile.baseRate || ''}
                        onChange={e => onChange('baseRate', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={inp}
                    />
                </div>
                {showUnit && (
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                        <select
                            value={profile.unit ?? ''}
                            onChange={e => onChange('unit', e.target.value as MeasurementUnit)}
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
                            value={profile.includedUnits ?? ''}
                            onChange={e => onChange('includedUnits', parseFloat(e.target.value) || 0)}
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
                            value={profile.overageRate ?? ''}
                            onChange={e => onChange('overageRate', parseFloat(e.target.value) || 0)}
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
                            value={profile.minimumCharge ?? ''}
                            onChange={e => onChange('minimumCharge', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className={inp}
                        />
                    </div>
                )}
            </div>

            {profile.name && profile.baseRate > 0 && (
                <p className="mt-3 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-3 py-1.5 font-medium">
                    Preview: {previewProfile(profile)}
                </p>
            )}
        </div>
    );
};

export default ProfileCard;