import { companyCacheScope } from '../../../../services/companySession';
import type { BudgetGoal } from '../../../../services/finances/budget/budget.types';
export type BudgetPeriod = { period: 'monthly' | 'yearly'; year: number; month?: number };
export type BudgetDraft = { input: string; expectedVersion: number; expectedId: string | null };
export type BudgetDrafts = Record<string, BudgetDraft>;
export function goalMatches(goal: BudgetGoal, period: BudgetPeriod, categoryId: string) {
    return goal.categoryId === categoryId && goal.period === period.period && goal.year === period.year &&
        (period.period === 'yearly' || goal.month === period.month);
}
export function draftKey(period: BudgetPeriod, categoryId: string) {
    return JSON.stringify([period.period, period.year, period.period === 'monthly' ? period.month : null, categoryId]);
}
// Memory only: survives route navigation in this session; never writes financial drafts to browser storage.
let retained: { scope: string; drafts: BudgetDrafts } | undefined;
let guarded = false;
const warn = (event: BeforeUnloadEvent) => {
    if (retained?.scope === companyCacheScope() && Object.keys(retained.drafts).length) {
        event.preventDefault(); event.returnValue = '';
    }
};
function syncGuard() {
    if (typeof window === 'undefined') return;
    const needed = Boolean(retained && Object.keys(retained.drafts).length);
    if (needed && !guarded) window.addEventListener('beforeunload', warn);
    if (!needed && guarded) window.removeEventListener('beforeunload', warn);
    guarded = needed;
}
export function readDrafts(scope: string): BudgetDrafts {
    if (retained?.scope !== scope) retained = { scope, drafts: {} };
    syncGuard();
    return retained.drafts;
}
export function retainDrafts(scope: string, drafts: BudgetDrafts) {
    if (retained?.scope === scope) retained = { scope, drafts };
    syncGuard();
}
