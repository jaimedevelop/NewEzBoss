import React, { useState, useEffect } from 'react';
import { Eye, Settings, Layers, Box, Info } from 'lucide-react';
import type { Estimate, ClientViewSettings, EstimateGroup } from '../../../../../services/estimates/estimates.types';
import { updateClientViewSettings } from '../../../../../services/estimates/estimates.clientView';
import { DisplaySettings, CustomGroupsManager, ItemGrouper } from './components';

interface ClientViewTabProps {
    estimate: Estimate;
    onUpdate: () => void;
}

export const ClientViewTab: React.FC<ClientViewTabProps> = ({ estimate, onUpdate }) => {
    const [activeSubTab, setActiveSubTab] = useState<'settings' | 'groups' | 'grouping'>('settings');
    const [isSaving, setIsSaving] = useState(false);
    const [localSettings, setLocalSettings] = useState<ClientViewSettings>(
        estimate.clientViewSettings || {
            displayMode: 'list',
            showItemPrices: true,
            showGroupPrices: true,
            showSubtotal: true,
            showTax: true,
            showTotal: true,
            hiddenLineItems: []
        }
    );

    const [localGroups, setLocalGroups] = useState<EstimateGroup[]>(estimate.groups || []);

    useEffect(() => {
        if (estimate.clientViewSettings) {
            setLocalSettings(estimate.clientViewSettings);
        }
        if (estimate.groups) {
            setLocalGroups(estimate.groups);
        }
    }, [estimate.clientViewSettings, estimate.groups]);

    const handleSaveSettings = async (newSettings: ClientViewSettings) => {
        if (!estimate.id) return;
        setIsSaving(true);
        try {
            await updateClientViewSettings(estimate.id, newSettings, localGroups);
            onUpdate();
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveGroups = async (newGroups: EstimateGroup[]) => {
        if (!estimate.id) return;
        setIsSaving(true);
        try {
            await updateClientViewSettings(estimate.id, localSettings, newGroups);
            onUpdate();
        } catch (error) {
            console.error('Failed to save groups:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Tab Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Client View Configuration</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={estimate.clientViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white border border-blue-200 rounded-lg transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            Preview Client View
                        </a>
                    </div>
                </div>
                <p className="text-sm text-gray-600">
                    Customize how your client sees this estimate. You can group items, hide specific items, or toggle price visibility.
                </p>

                {/* Sub-tabs */}
                <div className="flex items-center gap-4 mt-6">
                    <button
                        onClick={() => setActiveSubTab('settings')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSubTab === 'settings'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Display Settings
                    </button>
                    <button
                        onClick={() => setActiveSubTab('groups')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSubTab === 'groups'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        Manage Groups
                    </button>
                    <button
                        onClick={() => setActiveSubTab('grouping')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSubTab === 'grouping'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Box className="w-4 h-4" />
                        Assign Items
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeSubTab === 'settings' && (
                    <DisplaySettings
                        settings={localSettings}
                        onSave={handleSaveSettings}
                        isSaving={isSaving}
                    />
                )}
                {activeSubTab === 'groups' && (
                    <CustomGroupsManager
                        groups={localGroups}
                        onSave={handleSaveGroups}
                        isSaving={isSaving}
                    />
                )}
                {activeSubTab === 'grouping' && (
                    <ItemGrouper
                        estimate={estimate}
                        groups={localGroups}
                        settings={localSettings}
                        onUpdate={onUpdate}
                        onUpdateSettings={handleSaveSettings}
                    />
                )}
            </div>

            {/* Info Card */}
            <div className="m-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> You can hide specific internal line items (like equipment or specific labor) from the client while keeping them in your contractor view for cost tracking.
                </p>
            </div>
        </div>
    );
};
