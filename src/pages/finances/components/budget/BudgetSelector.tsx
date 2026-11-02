import { useEffect, useRef, useState } from 'react';
import type { FinanceCategory, BudgetGoal } from '../../../../services/finances';
import { upsertBudgetGoal } from '../../../../services/finances';
import { companyCacheScope } from '../../../../services/companySession';
import { parseBudgetAmount } from './budgetAmount';
import { draftKey, goalMatches, type BudgetDrafts, type BudgetPeriod } from './budgetDrafts';
interface Props {
    scope: string; categories: FinanceCategory[]; goals: BudgetGoal[]; period: BudgetPeriod; drafts: BudgetDrafts;
    onDraftsChange: (drafts: BudgetDrafts) => void; onSaved: (goal: BudgetGoal) => void;
    onSavingChange: (saving: boolean) => void; onReload: () => Promise<void>;
}
const currency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
export default function BudgetSelector({ scope, categories, goals, period, drafts, onDraftsChange, onSaved, onSavingChange, onReload }: Props) {
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const busy = useRef(false);
    const mounted = useRef(true);
    const draftsRef = useRef(drafts);
    draftsRef.current = drafts;
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const change = (next: BudgetDrafts) => { draftsRef.current = next; onDraftsChange(next); };
    const remove = (key: string) => { const next = { ...draftsRef.current }; delete next[key]; change(next); };
    const save = async (categoryId: string) => {
        const key = draftKey(period, categoryId);
        const draft = draftsRef.current[key];
        if (!draft || busy.current || scope !== companyCacheScope()) return;
        const amount = parseBudgetAmount(draft.input);
        if (amount === null) { setError('Enter an amount from 0 to 999,999,999,999 with at most two decimal places.'); return; }
        busy.current = true; setSaving(key); onSavingChange(true); setError(null);
        try {
            const goal = await upsertBudgetGoal({ userId: '', categoryId, amount, period: period.period, year: period.year, ...(period.period === 'monthly' ? { month: period.month } : {}), expectedVersion: draft.expectedVersion, expectedId: draft.expectedId });
            if (!mounted.current || companyCacheScope() !== scope) return;
            onSaved(goal);
            // Clear only the confirmed input; another edit must survive.
            if (draftsRef.current[key] === draft) remove(key);
        } catch (failure) {
            if (mounted.current && companyCacheScope() === scope) setError(`${failure instanceof Error ? failure.message : 'Save was not confirmed'}. Your draft is preserved. Reload saved data here, review it, and choose whether to keep your amount before saving again.`);
        } finally {
            busy.current = false;
            if (mounted.current && companyCacheScope() === scope) { setSaving(null); onSavingChange(false); }
        }
    };
    return <section className="bg-white rounded-xl border p-6 space-y-4" aria-label="Budget settings">
        <h2 className="text-xl font-bold">{period.period === 'monthly' ? `Monthly goals: ${period.year}-${String(period.month).padStart(2, '0')}` : `Yearly goals: ${period.year}`}</h2>
        <div className="flex gap-4">{(['expense', 'income'] as const).map(value => <button key={value} aria-pressed={type === value} onClick={() => setType(value)}>{value === 'expense' ? 'Expenses' : 'Income'}</button>)}</div>
        {error && <div role="alert"><p>{error}</p><button onClick={() => void onReload()} className="underline">Reload saved data without losing drafts</button></div>}
        {categories.filter(c => c.type === type).length === 0 && <p>No {type} categories found. Add categories to set goals.</p>}
        {categories.filter(c => c.type === type).map(category => {
            const id = category.id!;
            const key = draftKey(period, id);
            const goal = goals.find(row => goalMatches(row, period, id));
            const draft = drafts[key];
            const version = goal?.version ?? 0;
            const conflict = draft && (draft.expectedVersion !== version || draft.expectedId !== (goal?.id ?? null));
            return <div key={key} className="border-t pt-4 space-y-2">
                <h3 className="font-bold">{category.name}</h3>
                <p>Saved amount: {goal ? currency(goal.amount) : 'No goal saved'}</p>
                <p>Actual: Unavailable</p>
                <label className="block">{category.name} budget amount<input aria-label={`${category.name} budget amount`} type="text" inputMode="decimal" value={draft?.input ?? goal?.amount ?? ''} disabled={saving === key} onChange={e => change({ ...draftsRef.current, [key]: { input: e.target.value, expectedVersion: draft?.expectedVersion ?? version, expectedId: draft ? draft.expectedId : goal?.id ?? null } })} className="block border rounded p-2" /></label>
                {conflict && <p role="alert">The saved goal changed since you started editing. Review the saved amount above. Your draft has not been saved.</p>}
                {draft && <div className="flex flex-wrap gap-4">
                    <button disabled={saving !== null || Boolean(conflict)} onClick={() => void save(id)} className="border rounded p-2">{saving === key ? 'Saving…' : 'Save Changes'}</button>
                    {conflict && <button disabled={saving !== null} onClick={() => change({ ...draftsRef.current, [key]: { ...draft, expectedVersion: version, expectedId: goal?.id ?? null } })} className="border rounded p-2">Keep my amount using this saved version</button>}
                    <button disabled={saving !== null} onClick={() => remove(key)} className="underline">Discard draft and use saved amount</button>
                </div>}
            </div>;
        })}
    </section>;
}
