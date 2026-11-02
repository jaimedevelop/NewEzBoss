import test from 'node:test';
import assert from 'node:assert/strict';
import { draftKey, goalMatches, readDrafts, retainDrafts } from '../src/pages/finances/components/budget/budgetDrafts';
import type { BudgetGoal } from '../src/services/finances/budget/budget.types';
test('monthly and yearly goals and drafts have distinct exact period identities', () => {
 const monthly={period:'monthly' as const,year:2026,month:11};
 const yearly={period:'yearly' as const,year:2026};
 const goal={categoryId:'fuel',...yearly} as BudgetGoal;
 assert(!goalMatches(goal,monthly,'fuel'));assert(goalMatches(goal,yearly,'fuel'));
 assert.notEqual(draftKey(monthly,'fuel'),draftKey(yearly,'fuel'));
 assert.notEqual(draftKey(monthly,'fuel'),draftKey({...monthly,year:2027},'fuel'));
 assert(!goalMatches({...goal,period:'monthly',month:12},monthly,'fuel'));
});
test('drafts survive same-session remounts but never a company/session change', () => {
 readDrafts('A:1');const drafts={key:{input:'12.34',expectedVersion:2,expectedId:'id'}};
 retainDrafts('A:1',drafts);assert.deepEqual(readDrafts('A:1'),drafts);
 assert.deepEqual(readDrafts('B:2'),{});
 retainDrafts('A:1',drafts);assert.deepEqual(readDrafts('B:2'),{});
 assert.deepEqual(readDrafts('A:3'),{});
});
