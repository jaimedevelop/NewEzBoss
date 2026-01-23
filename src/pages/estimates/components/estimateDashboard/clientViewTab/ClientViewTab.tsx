import React, { useState, useEffect } from 'react';
import { Settings, Layers, Box, Save, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import type { Estimate, ClientViewSettings, EstimateGroup } from '../../../../../services/estimates/estimates.types';
import { updateClientViewSettings } from '../../../../../services/estimates/estimates.clientView';
import { DisplaySettings, CustomGroupsManager, ClientViewDocPreview } from './components';

interface ClientViewTabProps {
    estimate: Estimate;
    onUpdate: () => void;
}

export const ClientViewTab: React.FC<ClientViewTabProps> = ({ estimate, onUpdate }) => {
    const { userProfile } = useAuthContext();
    const [activeTab, setActiveTab] = useState<'settings' | 'groups'>('settings');
    const [isSaving, setIsSaving] = useState(false);

    // Internal state for editing
    const [localEstimate, setLocalEstimate] = useState<Estimate>(estimate);
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
    const [selectingGroupId, setSelectingGroupId] = useState<string | null>(null);

    // Reference state to track what's currently saved in the DB
    // This helps prevent flickering after save before parent props update
    const [savedState, setSavedState] = useState({
        settings: JSON.stringify(estimate.clientViewSettings || {}),
        groups: JSON.stringify(estimate.groups || []),
        lineItems: JSON.stringify(estimate.lineItems || [])
    });

    useEffect(() => {
        setLocalEstimate(estimate);
        if (estimate.clientViewSettings) {
            setLocalSettings(estimate.clientViewSettings);
        }
        if (estimate.groups) {
            setLocalGroups(estimate.groups);
        }
        setSavedState({
            settings: JSON.stringify(estimate.clientViewSettings || {}),
            groups: JSON.stringify(estimate.groups || []),
            lineItems: JSON.stringify(estimate.lineItems || [])
        });
    }, [estimate]);

    const handleSave = async () => {
        if (!estimate.id) return;
        setIsSaving(true);
        try {
            await updateClientViewSettings(estimate.id, localSettings, localGroups, localEstimate.lineItems);

            // Update saved state reference immediately to prevent flicker
            setSavedState({
                settings: JSON.stringify(localSettings),
                groups: JSON.stringify(localGroups),
                lineItems: JSON.stringify(localEstimate.lineItems)
            });

            onUpdate();
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateSettings = (newSettings: ClientViewSettings) => {
        setLocalSettings(newSettings);
    };

    const handleUpdateGroups = (newGroups: EstimateGroup[]) => {
        setLocalGroups(newGroups);
        handleAutoSave(localSettings, newGroups, localEstimate.lineItems);
    };


    const handleToggleItemInGroup = (itemId: string, groupId: string) => {
        const updatedLineItems = localEstimate.lineItems.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    groupId: item.groupId === groupId ? undefined : groupId
                };
            }
            return item;
        });
        setLocalEstimate({ ...localEstimate, lineItems: updatedLineItems });
        handleAutoSave(localSettings, localGroups, updatedLineItems);
    };

    const handleAutoSave = async (settings: ClientViewSettings, groups: EstimateGroup[], lineItems: any[]) => {
        if (!estimate.id) return;
        try {
            await updateClientViewSettings(estimate.id, settings, groups, lineItems);
            // We don't set isSaving here to avoid UI flicker for quick actions
            // but we update savedState so the "Save" button status is correct
            setSavedState({
                settings: JSON.stringify(settings),
                groups: JSON.stringify(groups),
                lineItems: JSON.stringify(lineItems)
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to auto-save settings:', error);
        }
    };

    const hasChanges = JSON.stringify(localSettings) !== savedState.settings ||
        JSON.stringify(localGroups) !== savedState.groups ||
        JSON.stringify(localEstimate.lineItems) !== savedState.lineItems;

    return (
        <div className="flex h-[calc(100vh-120px)] bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Left Column: Dynamic Preview Area (Swapped back to left) */}
            <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden relative border-r border-gray-100">
                {/* Mode Badges */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl shadow-gray-200/50">
                    <div className="px-2 py-0.5 rounded-lg bg-blue-50 text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                        Preview Mode
                    </div>
                    {selectingGroupId && (
                        <div className="px-2 py-0.5 rounded-lg bg-orange-50 text-[10px] font-black text-orange-600 uppercase tracking-tighter border border-orange-100 animate-pulse">
                            Selecting Items for {localGroups.find(g => g.id === selectingGroupId)?.name || 'Group'}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-12 flex justify-center">
                    <div className="w-full max-w-[850px] shadow-2xl shadow-gray-200/50 h-fit rounded-[2rem] overflow-hidden">
                        <ClientViewDocPreview
                            estimate={localEstimate}
                            settings={localSettings}
                            groups={localGroups}
                            selectingGroupId={selectingGroupId}
                            onToggleItemInGroup={handleToggleItemInGroup}
                            companyInfo={{
                                companyName: userProfile?.companyName,
                                address: userProfile?.address,
                                city: userProfile?.city,
                                state: userProfile?.state,
                                zipCode: userProfile?.zipCode,
                                logoUrl: userProfile?.logoUrl
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Right Column: Side Controls (Swapped back to right) */}
            <div className="w-80 flex flex-col bg-white">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="mb-6">
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 ${!hasChanges || isSaving
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-200/50'
                                }`}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Saving Changes...' : 'Save View Changes'}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">View Editor</h3>
                    </div>

                    <div className="flex p-1 bg-gray-50 rounded-xl">
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Box className="w-4 h-4" />
                            Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'groups' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Groups
                        </button>
                    </div>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'settings' && (
                        <DisplaySettings
                            settings={localSettings}
                            onChange={handleUpdateSettings}
                            isSaving={isSaving}
                        />
                    )}
                    {activeTab === 'groups' && (
                        <CustomGroupsManager
                            groups={localGroups}
                            onSave={handleUpdateGroups}
                            isSaving={isSaving}
                            selectingGroupId={selectingGroupId}
                            setSelectingGroupId={setSelectingGroupId}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
