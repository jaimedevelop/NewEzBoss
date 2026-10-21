import React from 'react';
import { List, LayoutGrid, Layers } from 'lucide-react';
import type { ClientViewSettings } from '../../../../../../services/estimates/estimates.types';

interface DisplaySettingsProps {
    settings: ClientViewSettings;
    onChange: (settings: ClientViewSettings) => void;
    isSaving: boolean;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ settings, onChange }) => {
    const toggleSetting = (key: keyof ClientViewSettings) => {
        if (typeof settings[key] === 'boolean') {
            onChange({ ...settings, [key]: !settings[key] });
        }
    };

    const handleModeChange = (mode: 'list' | 'byType' | 'byGroup') => {
        onChange({ ...settings, displayMode: mode });
    };

    return (
        <div className="space-y-6">
            {/* Display Mode */}
            <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Grouping Strategy</h3>
                <div className="flex flex-col gap-2">
                    {[
                        { id: 'list', icon: List, label: 'Simple List', desc: 'Standard table' },
                        { id: 'byType', icon: LayoutGrid, label: 'By Item Type', desc: 'Group by Materials, Labor...' },
                        { id: 'byGroup', icon: Layers, label: 'Custom Groups', desc: 'Organize by room, phase...' }
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => handleModeChange(mode.id as any)}
                            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${settings.displayMode === mode.id
                                ? 'border-orange-600 bg-orange-50'
                                : 'border-gray-50 bg-white hover:border-gray-200'
                                }`}
                        >
                            <div className={`p-2 rounded-lg shrink-0 ${settings.displayMode === mode.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                <mode.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <span className={`block text-sm font-semibold ${settings.displayMode === mode.id ? 'text-orange-900' : 'text-gray-900'}`}>{mode.label}</span>
                                <span className="text-[10px] text-gray-500">{mode.desc}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <fieldset className="space-y-4 border-t border-gray-100 pt-6">
                <legend className="text-xs font-bold text-gray-600">Layout &amp; styling</legend>
                {([
                    ['itemSpacing', 'Item spacing', 0, 40, 12],
                    ['sectionSpacing', 'Section spacing', 0, 80, 40],
                    ['textSize', 'Item text size', 10, 22, 14],
                    ['priceWidth', 'Price column width', 80, 200, 112],
                ] as const).map(([key, label, min, max, fallback]) => <label key={key} className="block text-xs text-gray-600">
                    {label} <span className="float-right">{Number((settings.layout?.[key] ?? fallback).toFixed(1))}px</span>
                    <input type="range" min={min} max={max} step="0.1" value={settings.layout?.[key] ?? fallback} aria-label={label} className="mt-2 w-full accent-orange-600"
                        onChange={event => onChange({ ...settings, layout: { ...settings.layout, [key]: Number(event.target.value) } })} />
                </label>)}
                <button type="button" className="text-xs text-orange-600" onClick={() => onChange({ ...settings, layout: {} })}>Reset layout</button>
            </fieldset>
            {/* Visibility Toggles */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Visibility Settings</h3>
                <div className="space-y-4">
                    {[
                        { key: 'showItemPrices', label: 'Item Prices', desc: 'Individual unit/total prices' },
                        { key: 'showGroupPrices', label: 'Group Prices', desc: 'Subtotals for groups' },
                        { key: 'showSubtotal', label: 'Subtotal', desc: 'Total before tax' },
                        { key: 'showTax', label: 'Tax', desc: 'Tax amount' },
                        { key: 'showTotal', label: 'Grand Total', desc: 'Final amount' },
                        { key: 'addImagesToEstimate', label: 'Add Images To Estimate', desc: 'Include pictures on a separate estimate page' },
                    ].map((setting) => (
                        <div key={setting.key} className="flex items-center justify-between group">
                            <div>
                                <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                                <p className="text-[10px] text-gray-500">{setting.desc}</p>
                            </div>
                            <button
                                onClick={() => toggleSetting(setting.key as keyof ClientViewSettings)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings[setting.key as keyof ClientViewSettings] ? 'bg-orange-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings[setting.key as keyof ClientViewSettings] ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
