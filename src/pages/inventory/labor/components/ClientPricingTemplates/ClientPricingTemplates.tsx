import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, AlertCircle, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { getLaborItems, updateLaborItem } from '../../../../../services/inventory/labor';
import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../../firebase/config';
import type { PricingProfile } from '../../../../../services/inventory/labor/labor.types';
import type { PricingTemplate, ScopeLevel, ViewMode } from './types';
import { blankProfile } from './templateUtils';
import TemplateList from './TemplateList';
import TemplateForm from './TemplateForm';
import TemplateApply from './TemplateApply';

interface ClientPricingTemplatesProps {
    isOpen: boolean;
    onClose: () => void;
}

const COLLECTION = 'labor_pricing_templates';
const backdrop = 'fixed inset-0 z-50 flex items-center justify-center';
const backdropBg = 'absolute inset-0 bg-black bg-opacity-50';
const modal = 'relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]';

// ─── Shared sub-components ────────────────────────────────────────────────────

const Toast: React.FC<{ toast: { type: 'success' | 'error'; msg: string } | null }> = ({ toast }) =>
    toast ? (
        <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
            ${toast.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {toast.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />}
            {toast.msg}
        </div>
    ) : null;

const Header: React.FC<{ title: string; subtitle?: string; onClose: () => void }> = ({ title, subtitle, onClose }) => (
    <div className="flex items-center justify-between p-6 border-b">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="h-6 w-6" />
        </button>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ClientPricingTemplates: React.FC<ClientPricingTemplatesProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuthContext();

    const [templates, setTemplates] = useState<PricingTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [view, setView] = useState<ViewMode>('list');
    const [editingTemplate, setEditing] = useState<PricingTemplate | null>(null);

    // ── Form state
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formProfiles, setFormProfiles] = useState<PricingProfile[]>([{ ...blankProfile(), isDefault: true }]);
    const [formTradeId, setFormTradeId] = useState('');
    const [formTradeName, setFormTradeName] = useState('');
    const [formSectionId, setFormSectionId] = useState('');
    const [formSectionName, setFormSectionName] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formCategoryName, setFormCategoryName] = useState('');

    // ── Apply state
    const [applyTemplate, setApplyTemplate] = useState<PricingTemplate | null>(null);
    const [applyLevel, setApplyLevel] = useState<ScopeLevel>('trade');
    const [applyTradeId, setApplyTradeId] = useState('');
    const [applyTradeName, setApplyTradeName] = useState('');
    const [applySecId, setApplySecId] = useState('');
    const [applySecName, setApplySecName] = useState('');
    const [applyCatId, setApplyCatId] = useState('');
    const [applyCatName, setApplyCatName] = useState('');
    const [applying, setApplying] = useState(false);
    const [applyResult, setApplyResult] = useState<{ updated: number; total: number } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const loadTemplates = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const q = query(collection(db, COLLECTION), where('userId', '==', currentUser.uid));
            const snap = await getDocs(q);
            setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as PricingTemplate)));
        } catch {
            showToast('error', 'Failed to load templates.');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => { if (isOpen) loadTemplates(); }, [isOpen, loadTemplates]);

    // ── View openers
    const openCreate = () => {
        setEditing(null);
        setFormName(''); setFormDesc('');
        setFormProfiles([{ ...blankProfile(), isDefault: true }]);
        setFormTradeId(''); setFormTradeName('');
        setFormSectionId(''); setFormSectionName('');
        setFormCategoryId(''); setFormCategoryName('');
        setView('create');
    };

    const openEdit = (t: PricingTemplate) => {
        setEditing(t);
        setFormName(t.name); setFormDesc(t.description);
        setFormProfiles(t.profiles.length ? t.profiles : [{ ...blankProfile(), isDefault: true }]);
        setFormTradeId(t.tradeId ?? ''); setFormTradeName(t.tradeName ?? '');
        setFormSectionId(t.sectionId ?? ''); setFormSectionName(t.sectionName ?? '');
        setFormCategoryId(t.categoryId ?? ''); setFormCategoryName(t.categoryName ?? '');
        setView('edit');
    };

    const openApply = (t: PricingTemplate) => {
        setApplyTemplate(t);
        setApplyTradeId(t.tradeId ?? ''); setApplyTradeName(t.tradeName ?? '');
        setApplySecId(t.sectionId ?? ''); setApplySecName(t.sectionName ?? '');
        setApplyCatId(t.categoryId ?? ''); setApplyCatName(t.categoryName ?? '');
        setApplyLevel(t.categoryId ? 'category' : t.sectionId ? 'section' : 'trade');
        setApplyResult(null);
        setView('apply');
    };

    // ── Save
    const handleSave = async () => {
        if (!formName.trim()) { showToast('error', 'Template name is required.'); return; }
        if (!formProfiles.some(p => p.name && p.baseRate > 0)) {
            showToast('error', 'At least one complete pricing profile is required.'); return;
        }
        if (!currentUser) return;
        setSaving(true);
        try {
            const payload = {
                name: formName.trim(),
                description: formDesc.trim(),
                profiles: formProfiles.filter(p => p.name && p.baseRate > 0),
                userId: currentUser.uid,
                updatedAt: serverTimestamp(),
                ...(formTradeId && { tradeId: formTradeId, tradeName: formTradeName }),
                ...(formSectionId && { sectionId: formSectionId, sectionName: formSectionName }),
                ...(formCategoryId && { categoryId: formCategoryId, categoryName: formCategoryName }),
            };
            if (editingTemplate) {
                await updateDoc(doc(db, COLLECTION, editingTemplate.id), payload);
                showToast('success', 'Template updated.');
            } else {
                await addDoc(collection(db, COLLECTION), { ...payload, createdAt: serverTimestamp() });
                showToast('success', 'Template created.');
            }
            await loadTemplates();
            setView('list');
        } catch {
            showToast('error', 'Failed to save template.');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete
    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this template? This cannot be undone.')) return;
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            showToast('success', 'Template deleted.');
            await loadTemplates();
        } catch {
            showToast('error', 'Failed to delete template.');
        }
    };

    // ── Apply
    const handleApply = async () => {
        if (!applyTemplate || !currentUser || !applyTradeId) {
            showToast('error', 'Select a trade to apply the template.'); return;
        }
        if (applyLevel === 'section' && !applySecId) { showToast('error', 'Select a section.'); return; }
        if (applyLevel === 'category' && !applyCatId) { showToast('error', 'Select a category.'); return; }
        setApplying(true); setApplyResult(null);
        try {
            const filters: Record<string, string> = { tradeId: applyTradeId };
            if (applyLevel === 'section') filters.sectionId = applySecId;
            if (applyLevel === 'category') filters.categoryId = applyCatId;
            const result = await getLaborItems(currentUser.uid, filters as any, 1000);
            if (!result.success) throw new Error(result.error);
            const items = result.data?.laborItems ?? [];
            let updated = 0;
            await Promise.all(items.map(async item => {
                try { await updateLaborItem(item.id!, { pricingProfiles: applyTemplate.profiles }); updated++; } catch { }
            }));
            setApplyResult({ updated, total: items.length });
            showToast('success', `Applied to ${updated} of ${items.length} labor item${items.length !== 1 ? 's' : ''}.`);
        } catch {
            showToast('error', 'Failed to apply template.');
        } finally {
            setApplying(false);
        }
    };

    if (!isOpen) return null;

    // ─── List ─────────────────────────────────────────────────────────────────
    if (view === 'list') return (
        <div className={backdrop}>
            <div className={backdropBg} onClick={onClose} />
            <div className={modal}>
                <Header
                    title="Client Pricing Templates"
                    subtitle="Reusable pricing profiles you can apply across your labor items"
                    onClose={onClose}
                />
                <Toast toast={toast} />
                <div className="flex-1 overflow-y-auto p-6">
                    <TemplateList
                        templates={templates} loading={loading}
                        onEdit={openEdit} onDelete={handleDelete} onApply={openApply}
                    />
                </div>
                <div className="p-6 border-t bg-gray-50 flex justify-between">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                        Close
                    </button>
                    <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                        <Plus className="h-4 w-4" />New Template
                    </button>
                </div>
            </div>
        </div>
    );

    // ─── Create / Edit ────────────────────────────────────────────────────────
    if (view === 'create' || view === 'edit') return (
        <div className={backdrop}>
            <div className={backdropBg} onClick={onClose} />
            <div className={modal}>
                <Header
                    title={view === 'edit' ? 'Edit Template' : 'New Template'}
                    subtitle="Define pricing profiles and optionally tag this template to a trade, section, or category"
                    onClose={onClose}
                />
                <Toast toast={toast} />
                <TemplateForm
                    userId={currentUser!.uid}
                    mode={view}
                    name={formName} desc={formDesc} profiles={formProfiles}
                    tradeId={formTradeId} tradeName={formTradeName}
                    sectionId={formSectionId} sectionName={formSectionName}
                    categoryId={formCategoryId} categoryName={formCategoryName}
                    saving={saving}
                    onNameChange={setFormName} onDescChange={setFormDesc}
                    onProfilesChange={setFormProfiles}
                    onTradeChange={(id, n) => { setFormTradeId(id); setFormTradeName(n); }}
                    onSectionChange={(id, n) => { setFormSectionId(id); setFormSectionName(n); }}
                    onCategoryChange={(id, n) => { setFormCategoryId(id); setFormCategoryName(n); }}
                    onSave={handleSave}
                    onBack={() => setView('list')}
                />
            </div>
        </div>
    );

    // ─── Apply ────────────────────────────────────────────────────────────────
    if (view === 'apply' && applyTemplate) return (
        <div className={backdrop}>
            <div className={backdropBg} onClick={onClose} />
            <div className={modal}>
                <Header
                    title="Apply Template"
                    subtitle={`Applying "${applyTemplate.name}" to labor items`}
                    onClose={onClose}
                />
                <Toast toast={toast} />
                <TemplateApply
                    userId={currentUser!.uid}
                    template={applyTemplate}
                    level={applyLevel}
                    tradeId={applyTradeId} tradeName={applyTradeName}
                    sectionId={applySecId} sectionName={applySecName}
                    categoryId={applyCatId} categoryName={applyCatName}
                    applying={applying} result={applyResult}
                    onLevelChange={setApplyLevel}
                    onTradeChange={(id, n) => { setApplyTradeId(id); setApplyTradeName(n); }}
                    onSectionChange={(id, n) => { setApplySecId(id); setApplySecName(n); }}
                    onCategoryChange={(id, n) => { setApplyCatId(id); setApplyCatName(n); }}
                    onApply={handleApply}
                    onBack={() => setView('list')}
                />
            </div>
        </div>
    );

    return null;
};

export default ClientPricingTemplates;