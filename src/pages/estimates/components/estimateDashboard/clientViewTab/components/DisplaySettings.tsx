import React from 'react';
import { List, LayoutGrid, Layers, Save, Loader2 } from 'lucide-react';
import type { ClientViewSettings } from '../../../../../../services/estimates/estimates.types';

interface DisplaySettingsProps {
    settings: ClientViewSettings;
    onSave: (settings: ClientViewSettings) => void;
    isSaving: boolean;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ settings, onSave, isSaving }) => {
    const [localSettings, setLocalSettings] = React.useState(settings);

    React.useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const toggleSetting = (key: keyof ClientViewSettings) => {
        if (typeof localSettings[key] === 'boolean') {
            setLocalSettings({ ...localSettings, [key]: !localSettings[key] });
        }
    };

    const handleModeChange = (mode: 'list' | 'byType' | 'byGroup') => {
        setLocalSettings({ ...localSettings, displayMode: mode });
    };

    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

    return (
        <div className="space-y-8">
            {/* Display Mode */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Group Items By</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleModeChange('list')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${localSettings.displayMode === 'list'
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                    >
                        <div className={`p-3 rounded-lg ${localSettings.displayMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <List className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <span className={`block font-medium ${localSettings.displayMode === 'list' ? 'text-blue-900' : 'text-gray-900'}`}>Simple List</span>
                            <span className="text-xs text-gray-500">Standard table layout</span>
                        </div>
                    </button>

                    <button
                        onClick={() => handleModeChange('byType')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${localSettings.displayMode === 'byType'
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                    >
                        <div className={`p-3 rounded-lg ${localSettings.displayMode === 'byType' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <LayoutGrid className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <span className={`block font-medium ${localSettings.displayMode === 'byType' ? 'text-blue-900' : 'text-gray-900'}`}>By Item Type</span>
                            <span className="text-xs text-gray-500">Group by Materials, Labor, etc.</span>
                        </div>
                    </button>

                    <button
                        onClick={() => handleModeChange('byGroup')}
                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${localSettings.displayMode === 'byGroup'
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-100 bg-white hover:border-gray-200'
                            }`}
                    >
                        <div className={`p-3 rounded-lg ${localSettings.displayMode === 'byGroup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <Layers className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <span className={`block font-medium ${localSettings.displayMode === 'byGroup' ? 'text-blue-900' : 'text-gray-900'}`}>Custom Groups</span>
                            <span className="text-xs text-gray-500">Organize by room, phase, or task</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Visibility Toggles */}
            <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-6 uppercase tracking-wider">Visibility Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    {/* Individual Prices */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Show Individual Prices</p>
                            <p className="text-sm text-gray-500">Display unit and total price for each item</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('showItemPrices')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.showItemPrices ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showItemPrices ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Group Prices */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Show Group Prices</p>
                            <p className="text-sm text-gray-500">Display subtotal for each group of items</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('showGroupPrices')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.showGroupPrices ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showGroupPrices ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Subtotal */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Show Subtotal</p>
                            <p className="text-sm text-gray-500">Display the subtotal before tax/discounts</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('showSubtotal')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.showSubtotal ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showSubtotal ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Tax */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Show Tax</p>
                            <p className="text-sm text-gray-500">Display the tax amount applied to estimate</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('showTax')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.showTax ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showTax ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Show Grand Total</p>
                            <p className="text-sm text-gray-500">Display the final total amount</p>
                        </div>
                        <button
                            onClick={() => toggleSetting('showTotal')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.showTotal ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showTotal ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={() => onSave(localSettings)}
                    disabled={!hasChanges || isSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Display Settings
                </button>
            </div>
        </div>
    );
};
