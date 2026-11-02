import { financeWrite, financeResult, financeSubscribe } from '../financeApi';
import type { FinanceCategory, BudgetGoal } from './budget.types';
export const createFinanceCategory=(data:Omit<FinanceCategory,'id'|'createdAt'|'updatedAt'>)=>financeResult(()=>financeWrite('finance-categories','POST',data));
export const updateFinanceCategory=(id:string,data:Partial<FinanceCategory>)=>financeResult(()=>financeWrite('finance-categories','PATCH',data,id));
export const deleteFinanceCategory=(id:string,version:number|undefined)=>financeResult(()=>financeWrite('finance-categories','DELETE',{version},id));
export const subscribeToFinanceCategories=(_uid:string,cb:(rows:FinanceCategory[])=>void)=>financeSubscribe('finance-categories',cb);
// Version 0 means create only. Existing goals require the version originally edited.
export const upsertBudgetGoal=(data:Omit<BudgetGoal,'id'|'createdAt'|'updatedAt'|'version'> & {expectedVersion:number;expectedId:string|null})=>financeWrite<BudgetGoal>('budget-goals','POST',data);
export const subscribeToBudgetGoals=(_uid:string,year:number,month:number,cb:(rows:BudgetGoal[])=>void)=>financeSubscribe('budget-goals',cb,(g:BudgetGoal)=>g.year===year&&(g.period==='yearly'||g.month===month));
