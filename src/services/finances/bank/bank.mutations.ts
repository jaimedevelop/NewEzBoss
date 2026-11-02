import { financeWrite, financeResult } from '../financeApi';
import type { BankAccount } from './bank.types';
export const createBankAccount=(data:Omit<BankAccount,'id'|'createdAt'|'updatedAt'|'lastUpdated'|'isActive'>)=>financeResult(()=>financeWrite('bank-accounts','POST',data));
export const updateBankAccount=(id:string,data:Partial<BankAccount>)=>financeResult(()=>financeWrite('bank-accounts','PATCH',data,id));
export const deleteBankAccount=(id:string,version:number|undefined)=>financeResult(()=>financeWrite('bank-accounts','DELETE',{version},id));
