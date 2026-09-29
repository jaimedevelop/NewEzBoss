import React, { useState, useEffect, useRef } from 'react';
import { Settings, Layers, Box, Loader2, Download } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import type { Estimate, ClientViewSettings, EstimateGroup } from '../../../../../services/estimates/estimates.types';
import { updateClientViewSettings } from '../../../../../services/estimates/estimates.clientView';
import { downloadElementAsPdf } from '../../../../../utils/pdfExport';
import { getDocumentIdentity } from '../../../../../services/estimates/documentIdentity';
import { DisplaySettings, CustomGroupsManager, ClientViewDocPreview, ClientTabViewAccess } from './components';

interface ClientViewTabProps {
    estimate: Estimate;
    onUpdate: () => void;
}

export const ClientViewTab: React.FC<ClientViewTabProps> = ({ estimate, onUpdate }) => {
    const { userProfile } = useAuthContext();
    const [activeTab, setActiveTab] = useState<'settings' | 'groups'>('settings');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const docPreviewRef = useRef<HTMLDivElement>(null);

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
            hiddenLineItems: [],
            showEstimateTab: true,
            showPaymentsTab: true,
            showTimelineTab: true,
            showMessagesTab: false,
            showHistoryTab: false,
            addImagesToEstimate: false,
        }
    );
    const [localGroups, setLocalGroups] = useState<EstimateGroup[]>(estimate.groups || []);
    const [selectingGroupId, setSelectingGroupId] = useState<string | null>(null);
    const previewEstimate = {
        ...localEstimate,
        estimateState: estimate.estimateState,
        estimateNumber: estimate.estimateNumber,
        invoiceNumber: estimate.invoiceNumber,
    };

    const saveSequence = useRef(0);
    const saveTimer = useRef<number | null>(null);
    const pendingSave = useRef(false);

    useEffect(() => () => {
        if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    }, []);

    useEffect(() => {
        // Keep pictures and line items current while this editor stays mounted,
        // but never replace an edit with a refresh received during autosave.
        if (estimate.id === localEstimate.id && pendingSave.current) return;
        setLocalEstimate(estimate);
        if (estimate.clientViewSettings) {
            setLocalSettings(estimate.clientViewSettings);
        }
        if (estimate.groups) {
            setLocalGroups(estimate.groups);
        }
    }, [estimate, localEstimate.id]);

    const queueAutoSave = (settings: ClientViewSettings, groups: EstimateGroup[], lineItems: any[]) => {
        if (!estimate.id) return;
        if (estimate.archivedAt) return;
        const sequence = ++saveSequence.current;
        setIsSaving(true);
        setSaveError(false);
        pendingSave.current = true;
        if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(async () => {
            saveTimer.current = null;
            try {
                await updateClientViewSettings(estimate.id!, settings, groups, lineItems);
                if (sequence !== saveSequence.current) return;
                pendingSave.current = false;
                setSaveError(false);
                setIsSaving(false);
                onUpdate();
            } catch (error) {
                if (sequence !== saveSequence.current) return;
                console.error('Failed to auto-save client view:', error);
                setSaveError(true);
                setIsSaving(false);
            }
        }, 250);
    };

    const handleDownloadPdf = async () => {
        if (!docPreviewRef.current || downloadingPdf) return;
        setDownloadingPdf(true);
        try {
            await downloadElementAsPdf(docPreviewRef.current, getDocumentIdentity(estimate).exportFilename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            window.alert('Unable to download the PDF. Please check that the company logo loads and try again.');
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleUpdateSettings = (newSettings: ClientViewSettings) => {
        setLocalSettings(newSettings);
        queueAutoSave(newSettings, localGroups, localEstimate.lineItems);
    };

    const handleUpdateGroups = (newGroups: EstimateGroup[]) => {
        setLocalGroups(newGroups);
        queueAutoSave(localSettings, newGroups, localEstimate.lineItems);
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
        queueAutoSave(localSettings, localGroups, updatedLineItems);
    };

    const tabAccessLocked = Boolean(
        estimate.sentDate ||
        estimate.clientState ||
        ['sent', 'viewed', 'accepted', 'rejected', 'expired'].includes(estimate.status ?? '')
    );

    return (
        <div className="flex h-[calc(100vh-120px)] bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Left Column: Dynamic Preview Area (Swapped back to left) */}
            <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden relative border-r border-gray-100">
                {/* Mode Badges */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                    <div className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl shadow-gray-200/50">
                        <div className="px-2 py-0.5 rounded-lg bg-orange-50 text-[10px] font-black text-orange-600 uppercase tracking-tighter">
                            Preview Mode
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl shadow-gray-200/50 text-[10px] font-black text-orange-600 uppercase tracking-tighter whitespace-nowrap hover:bg-white disabled:opacity-50 transition-colors"
                    >
                        {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {downloadingPdf ? 'Preparing...' : 'Download PDF'}
                    </button>
                    {selectingGroupId && (
                        <div className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl shadow-gray-200/50">
                            <div className="px-2 py-0.5 rounded-lg bg-orange-50 text-[10px] font-black text-orange-600 uppercase tracking-tighter border border-orange-100 animate-pulse">
                                Selecting Items for {localGroups.find(g => g.id === selectingGroupId)?.name || 'Group'}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-12 flex justify-center">
                    <div className="w-full max-w-[850px] shadow-2xl shadow-gray-200/50 h-fit rounded-[2rem] overflow-hidden">
                        <div ref={docPreviewRef}>
                            <ClientViewDocPreview
                                estimate={previewEstimate}
                                settings={localSettings}
                                groups={localGroups}
                                selectingGroupId={selectingGroupId}
                                onToggleItemInGroup={handleToggleItemInGroup}
                                companyInfo={{
                                    companyName: userProfile?.company,
                                    address: userProfile?.address,
                                    city: userProfile?.city,
                                    state: userProfile?.state,
                                    zipCode: userProfile?.zipCode,
                                    logoUrl: userProfile?.companyLogo,
                                    phone: userProfile?.phone,
                                    website: userProfile?.website,
                                    email: userProfile?.email,
                                    licenses: userProfile?.licenses
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Side Controls (Swapped back to right) */}
            <div className="w-80 flex flex-col bg-white">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">View Editor</h3>
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-gray-400" aria-live="polite">
                            {isSaving ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving</> : saveError ? 'Save failed' : 'Auto-saved'}
                        </span>
                    </div>

                    <div className="flex p-1 bg-gray-50 rounded-xl">
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Box className="w-4 h-4" />
                            Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'groups' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Groups
                        </button>
                    </div>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'settings' && (
                        <>
                            <DisplaySettings
                                settings={localSettings}
                                onChange={handleUpdateSettings}
                                isSaving={isSaving}
                            />
                            <ClientTabViewAccess
                                settings={localSettings}
                                onChange={handleUpdateSettings}
                                locked={tabAccessLocked}
                            />
                        </>
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
