import React, { useState, useEffect } from 'react';
import { Eye, Settings, Layers, Box, Info } from 'lucide-react';
import type { Estimate, ClientViewSettings, EstimateGroup } from '../../../../../services/estimates/estimates.types';
import { updateClientViewSettings } from '../../../../../services/estimates/estimates.clientView';
import { DisplaySettings, CustomGroupsManager, ItemGrouper, ClientViewDocPreview } from './components';

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
        <div className="flex h-[calc(100vh-200px)] min-h-[600px] bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Preview Toolbar */}
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 leading-tight">Live Client Preview</h2>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Estimate #{estimate.estimateNumber || 'Draft'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={estimate.clientViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-gray-200 rounded-xl transition-all hover:border-blue-200 shadow-sm"
                        >
                            <Eye className="w-4 h-4" />
                            Open External Preview
                        </a>
                    </div>
                </div>

                {/* Paper Container */}
                <div className="flex-1 overflow-y-auto p-12 bg-gray-100/50 flex justify-center scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="w-full h-fit flex justify-center">
                        <ClientViewDocPreview
                            estimate={estimate}
                            settings={localSettings}
                            groups={localGroups}
                        />
                    </div>
                </div>
            </div>

            {/* Editor Sidebar */}
            <div className="w-[380px] bg-white border-l border-gray-200 flex flex-col shrink-0">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">View Editor</h3>
                    </div>

                    {/* Sidebar Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl font-sans">
                        {[
                            { id: 'settings', label: 'Layout', icon: Settings },
                            { id: 'groups', label: 'Groups', icon: Layers },
                            { id: 'grouping', label: 'Items', icon: Box }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id as any)}
                                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all ${activeSubTab === tab.id
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
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

                {/* Tip Card */}
                <div className="p-6 bg-blue-50 border-t border-blue-100 flex gap-3">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                        <strong>Pro Tip:</strong> Hiding internal line items (like equipment or labor) keeps them visible in your contractor view while presenting a clean estimate.
                    </p>
                </div>
            </div>
        </div>
    );
};
