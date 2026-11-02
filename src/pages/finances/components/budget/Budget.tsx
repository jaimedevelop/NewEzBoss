import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import type { FinanceCategory, BudgetGoal } from '../../../../services/finances';
import { financeList } from '../../../../services/finances/financeApi';
import { companyCacheScope } from '../../../../services/companySession';
import PageHeader from '../shared/PageHeader';
import BudgetSelector from './BudgetSelector';
import CategoryManager from './CategoryManager';
import { readDrafts, retainDrafts, type BudgetPeriod, type BudgetDrafts } from './budgetDrafts';

type ReadState<T> = { rows: T[]; loaded: boolean; error: string | null };
const initial = <T,>(): ReadState<T> => ({ rows: [], loaded: false, error: null });
function BudgetWorkspace({ scope }: { scope: string }) {
    const [categories, setCategories] = useState<ReadState<FinanceCategory>>(initial);
    const [goals, setGoals] = useState<ReadState<BudgetGoal>>(initial);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<BudgetPeriod>(() => {
        const date = new Date();
        return { period: 'monthly', year: date.getFullYear(), month: date.getMonth() + 1 };
    });
    const [drafts, setDrafts] = useState<BudgetDrafts>(() => readDrafts(scope));
    const [saving, setSaving] = useState(false);
    const mounted = useRef(false);
    const running = useRef(false);
    const dirtyRead = useRef(false);
    const readGeneration = useRef(0);
    const updateDrafts = useCallback((next: BudgetDrafts) => {
        retainDrafts(scope, next);
        setDrafts(next);
    }, [scope]);
    const refresh = useCallback(async () => {
        if (companyCacheScope() !== scope) return;
        if (running.current) { dirtyRead.current = true; return; }
        const generation = readGeneration.current;
        running.current = true;
        setRefreshing(true);
        const load = async <T,>(kind: string, set: React.Dispatch<React.SetStateAction<ReadState<T>>>) => {
            try {
                const rows = await financeList<T>(kind);
                if (mounted.current && companyCacheScope() === scope && generation === readGeneration.current) set({ rows, loaded: true, error: null });
            } catch {
                if (mounted.current && companyCacheScope() === scope) set(prev => ({ ...prev, error: 'Could not refresh saved data. Your draft amounts are preserved.' }));
            }
        };
        await Promise.all([load('finance-categories', setCategories), load('budget-goals', setGoals)]);
        running.current = false;
        if (mounted.current && companyCacheScope() === scope) {
            setRefreshing(false);
            if (dirtyRead.current) { dirtyRead.current = false; void refresh(); }
        }
    }, [scope]);
    useEffect(() => {
        mounted.current = true;
        void refresh();
        const retry = () => { void refresh(); };
        const timer = window.setInterval(retry, 30000);
        window.addEventListener('focus', retry);
        window.addEventListener('ezboss:finance-changed', retry);
        return () => { mounted.current = false; clearInterval(timer); window.removeEventListener('focus', retry); window.removeEventListener('ezboss:finance-changed', retry); };
    }, [refresh]);
    const dirty = Object.keys(drafts).length > 0 || saving;
    const failed = categories.error || goals.error;
    return <div className="min-h-screen bg-gray-50">
        <PageHeader title="Budget Goals" description="Manage saved monthly and yearly budget goals." breadcrumbs={[{ label: 'Financial Health', path: '/finances' }, { label: 'Budget Goals', path: '/finances/budget' }]} />
        <div className="max-w-[1600px] mx-auto p-8 space-y-6">
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4">Actual income, spending, progress, and pricing recommendations are unavailable until verified totals are connected.</p>
            <div className="flex flex-wrap items-end gap-4">
                <label>Period<select aria-label="Budget period" value={period.period} onChange={e => setPeriod(prev => ({ ...prev, period: e.target.value as BudgetPeriod['period'] }))} className="block border p-2"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
                <label>Year<input aria-label="Budget year" type="number" min="1900" max="9999" value={period.year} onChange={e => { const year = Number(e.target.value); if (Number.isInteger(year) && year >= 1900 && year <= 9999) setPeriod(prev => ({ ...prev, year })); }} className="block border p-2" /></label>
                {period.period === 'monthly' && <label>Month<select aria-label="Budget month" value={period.month} onChange={e => setPeriod(prev => ({ ...prev, month: Number(e.target.value) }))} className="block border p-2">{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>}
                <button disabled={refreshing} onClick={() => void refresh()} className="border rounded px-4 py-2">{refreshing ? 'Refreshing saved data…' : failed ? 'Retry loading saved data' : 'Reload saved data'}</button>
            </div>
            <p className="text-sm">Edits stay with the selected period, including across month rollover. Unsaved drafts are kept during navigation in this company session. Reloading or signing out discards them.</p>
            {dirty && <p role="status">You have unsaved amounts. Reload saved data in place to review changes without losing your drafts.</p>}
            {failed && <p role="alert">{failed} {categories.loaded && goals.loaded ? 'Showing previously loaded saved values; reload before resolving conflicts.' : 'Budget editing is unavailable until both reads succeed.'}</p>}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {categories.loaded && goals.loaded ? <BudgetSelector scope={scope} period={period} categories={categories.rows} goals={goals.rows} drafts={drafts} onDraftsChange={updateDrafts} onSaved={goal => { readGeneration.current++; dirtyRead.current = running.current; setGoals(prev => ({ ...prev, rows: [...prev.rows.filter(row => row.id !== goal.id), goal] })); }} onSavingChange={setSaving} onReload={refresh} /> : !failed && <p role="status">Loading saved budget settings…</p>}
                </div>
                <CategoryManager />
            </div>
        </div>
    </div>;
}
export default function Budget() {
    const { currentUser } = useAuthContext();
    const scope = companyCacheScope();
    if (!currentUser?.uid) return null;
    return <BudgetWorkspace key={`${currentUser.uid}:${scope}`} scope={scope} />;
}
