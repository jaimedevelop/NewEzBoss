import { updateLineItem } from '../../../../../services/estimates/estimates.lineItems';
import { estimatesApiRequest } from '../../../../../services/estimates/estimatesApi';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Settings, Layers, Box, Loader2, Download } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import type { Estimate, ClientViewSettings, EstimateGroup } from '../../../../../services/estimates/estimates.types';
import { updateClientViewSettings } from '../../../../../services/estimates/estimates.clientView';
import { downloadElementAsPdf } from '../../../../../utils/pdfExport';
import { getDocumentIdentity } from '../../../../../services/estimates/documentIdentity';

import { DisplaySettings, CustomGroupsManager, ClientViewDocPreview, ClientTabViewAccess } from './components';

import type { EstimateAutosave } from '../estimateTab/useEstimateAutosave';

interface ClientViewTabProps {
    estimate: Estimate;
    isActive?: boolean;
    autosave?: EstimateAutosave;
    onOptimisticUpdate?: (patch: Partial<Estimate>) => void;
    onUpdate: () => void;
}

export const ClientViewTab: React.FC<ClientViewTabProps> = ({ estimate, isActive = true, onUpdate, autosave, onOptimisticUpdate }) => {
    const { canPerform } = useAuthContext();
    const [activeTab, setActiveTab] = useState<'settings' | 'groups'>('settings');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const client = estimate.clientSnapshot ?? null;
    const docPreviewRef = useRef<HTMLDivElement>(null);
    const previewScrollRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (isActive && previewScrollRef.current) {
            previewScrollRef.current.scrollTop = 0;
        }
    }, [isActive]);

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

    const latestEstimate = useRef(estimate);
    latestEstimate.current = estimate;
    const saveSequence = useRef(0);
    const saveTimer = useRef<number | null>(null);
    const pendingSave = useRef(false);
    const scheduledPersist = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => autosave?.registerFlusher(() => {
        if (saveTimer.current !== null) {
            window.clearTimeout(saveTimer.current);
            saveTimer.current = null;
            void scheduledPersist.current?.();
        }
    }), [autosave?.registerFlusher]);

    useEffect(() => () => {
        if (saveTimer.current !== null) {
            window.clearTimeout(saveTimer.current);
            saveTimer.current = null;
            void scheduledPersist.current?.();
        }
    }, []);

    useEffect(() => {
        // Keep pictures and line items current while this editor stays mounted,
        // but never replace an edit with a refresh received during autosave.
        if (estimate.id === localEstimate.id && pendingSave.current) {
            setLocalEstimate(estimate);
            return;
        }
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
        const persist = async () => {
            saveTimer.current = null;
            try {
                onOptimisticUpdate?.({ clientViewSettings: settings, groups });
                const save = async () => {
                    const assignments = new Map(lineItems.map(item => [item.id, item.groupId]));
                    const currentItems = latestEstimate.current.lineItems.map(item => assignments.has(item.id)
                        ? { ...item, groupId: assignments.get(item.id) } : item);
                    await updateClientViewSettings(estimate.id!, settings, groups, currentItems);
                    return { ok: true as const };
                };
                if (autosave) {
                    const result = await autosave.run('client-view', save);
                    if (!result.ok) throw new Error(result.message);
                } else await save();
                if (sequence !== saveSequence.current) return;
                pendingSave.current = false;
                setSaveError(false);
                setIsSaving(false);
                if (!autosave) onUpdate();
            } catch (error) {
                if (sequence !== saveSequence.current) return;
                console.error('Failed to auto-save client view:', error);
                setSaveError(true);
                setIsSaving(false);
            }
        };
        scheduledPersist.current = persist;
        saveTimer.current = window.setTimeout(persist, 250);
    };

    const handlePriceChange = async (itemId: string, unitPrice: number) => {
        if (!estimate.id || estimate.archivedAt || !canPerform('write:estimates')) return;
        const current = latestEstimate.current;
        const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
        const lineItems = current.lineItems.map(item => item.id === itemId
            ? { ...item, unitPrice, total: money(item.quantity * unitPrice) } : item);
        const subtotal = money(lineItems.reduce((sum, item) => sum + item.total, 0));
        const discount = current.discountType === 'percentage' ? subtotal * (current.discount ?? 0) / 100 : current.discount ?? 0;
        const tax = money((subtotal - discount) * (current.taxRate ?? 0) / 100);
        const patch = { lineItems, subtotal, tax, total: money(subtotal - discount + tax) };
        const updated = { ...current, ...patch };
        latestEstimate.current = updated;
        setLocalEstimate(updated);
        onOptimisticUpdate?.(patch);
        const save = async () => {
            const item = latestEstimate.current.lineItems.find(row => row.id === itemId);
            if (!item) return { ok: false as const, message: 'Item no longer exists' };
            const result = await updateLineItem(estimate.id!, itemId, { unitPrice }, '', '');
            return result.success ? { ok: true as const } : { ok: false as const, message: result.error };
        };
        const result = autosave ? await autosave.run(`client-price-${itemId}`, save) : await save();
        if (!result.ok) throw new Error(result.message);
        if (!autosave) onUpdate();
    };

    const handleGroupPriceChange = async (scope: { mode: 'group'; groupId: string | null } | { mode: 'type'; category: string }, targetTotal: number) => {
        if (!estimate.id || estimate.archivedAt || !canPerform('write:estimates')) return;
        const save = async () => {
            await estimatesApiRequest(`/estimates/${estimate.id}/group-adjustment`, {
                method: 'PUT',
                body: JSON.stringify({ scope: scope.mode === 'group' ? { ...scope, groupId: scope.groupId === null ? null : Number(scope.groupId) } : scope, targetTotal }),
            });
            return { ok: true as const };
        };
        const key = scope.mode === 'group' ? `group:${scope.groupId}` : `type:${scope.category}`;
        const result = autosave ? await autosave.run(`group-adjustment-${key}`, save) : await save();
        if (!result.ok) throw new Error(result.message);
        if (!autosave) onUpdate();
    };

    const handleDownloadPdf = async () => {
        if (!docPreviewRef.current || downloadingPdf) return;
        setDownloadingPdf(true);
        try {
            await estimatesApiRequest(`/estimates/${estimate.id}/export`);
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


    const handleAssignItemsToGroup = (ids: string[], groupId: string, remove = false) => {
        const selected = new Set(ids);
        const updatedLineItems = localEstimate.lineItems.map(item =>
            selected.has(item.id) && !item.adjustmentKind && (!remove || item.groupId === groupId)
                ? { ...item, groupId: remove ? undefined : groupId } : item);
        setLocalEstimate({ ...localEstimate, lineItems: updatedLineItems });
        queueAutoSave(localSettings, localGroups, updatedLineItems);
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
        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-120px)] bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            {/* Left Column: Dynamic Preview Area (Swapped back to left) */}
            <div className="min-w-0 flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden relative border-r border-gray-100">
                {/* Mode Badges */}
                <div className="relative lg:absolute lg:top-6 lg:left-1/2 lg:-translate-x-1/2 z-10 flex flex-wrap justify-center items-center gap-2 p-2 lg:p-0">
                    <div className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl shadow-gray-200/50">
                        <div className="px-2 py-0.5 rounded-lg bg-orange-50 text-[10px] font-black text-orange-600 uppercase tracking-tighter">
                            Preview Mode
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf || !canPerform('export:estimates')}
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

                <div ref={previewScrollRef} className="flex-1 overflow-auto p-2 lg:p-12 flex lg:justify-center">
                    <div className="w-full min-w-[700px] lg:min-w-0 max-w-[850px] shadow-2xl shadow-gray-200/50 h-fit rounded-[2rem] overflow-hidden">
                        <div ref={docPreviewRef}>
                            <ClientViewDocPreview
                                onReorder={!estimate.archivedAt && canPerform('write:estimates') && !selectingGroupId ? (scope, ids) => {
                                    handleUpdateSettings({ ...localSettings, presentationOrder: { ...localSettings.presentationOrder, [scope]: ids } });
                                } : undefined}
                                onGroupPriceChange={!estimate.archivedAt && canPerform('write:estimates') ? handleGroupPriceChange : undefined}
                                onPriceChange={!estimate.archivedAt && canPerform('write:estimates') ? handlePriceChange : undefined}
                                showMissingAddressWarning
                                estimate={previewEstimate}
                                client={client}
                                settings={localSettings}
                                groups={localGroups}
                                selectingGroupId={selectingGroupId}
                                onToggleItemInGroup={handleToggleItemInGroup}
                                companyInfo={{
                                    companyName: estimate.contractorCompany,
                                    address: estimate.contractorCompanyAddress,
                                    city: undefined,
                                    state: undefined,
                                    zipCode: undefined,
                                    logoUrl: estimate.contractorCompanyLogo,
                                    phone: estimate.contractorCompanyPhone,
                                    website: estimate.contractorCompanyWebsite,
                                    email: estimate.contractorCompanyEmail,
                                    licenses: estimate.contractorCompanyLicenses
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Side Controls (Swapped back to right) */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">View Editor</h3>
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-gray-400" aria-live="polite">
                            {autosave?.status === 'error' ? <button type="button" onClick={autosave.retry}>Save failed · Retry</button> : isSaving || autosave?.status === 'saving' ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving</> : saveError ? 'Save failed' : 'Auto-saved'}
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
                <fieldset disabled={Boolean(estimate.archivedAt) || !canPerform('write:estimates')} className="flex-1 lg:overflow-y-auto p-3 sm:p-6">
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
                            items={localEstimate.lineItems}
                            onAssign={handleAssignItemsToGroup}
                            onSave={handleUpdateGroups}
                            isSaving={isSaving}
                            selectingGroupId={selectingGroupId}
                            setSelectingGroupId={setSelectingGroupId}
                        />
                    )}
                </fieldset>
            </div>
        </div>
    );
};
