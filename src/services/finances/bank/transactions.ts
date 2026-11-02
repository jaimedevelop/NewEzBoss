import { financeList, financeWrite, financeSubscribe } from '../financeApi';
export interface Transaction {
    id: string;
    bankAccountId: string;
    date: string; // ISO String for simplified sorting/display or keeping original string format
    description: string;
    amount: number;
    category: string;
    balance?: number;
    createdAt?: Date;
    status: 'pending' | 'cleared' | 'reconciled';
}


export const createTransaction=async(transaction:Omit<Transaction,'id'>):Promise<string>=>(await financeWrite('bank-transactions','POST',transaction)).id;
export const getTransactions=(bankAccountId:string):Promise<Transaction[]>=>financeList('bank-transactions',`bankAccountId=${encodeURIComponent(bankAccountId)}`);
export async function bulkCreateTransactions(transactions:Omit<Transaction,'id'>[],statementId?:string,decisions:ImportDecision[]=[]):Promise<{imported:number;duplicates:number}> {
 // Stable payload hash survives response loss, reloads and repeated statement uploads.
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(transactions)));
 const importId=statementId??Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 return financeWrite('bank-transaction-imports','POST',{importId,transactions,decisions});
}

export const subscribeToTransactions=(id:string,cb:(rows:Transaction[])=>void,onError:(message:string)=>void)=>financeSubscribe('bank-transactions',cb,undefined,onError,`bankAccountId=${encodeURIComponent(id)}`);
export interface ImportCandidate {index:number;fingerprint:string;existingIds:string[];}
export interface ImportDecision {index:number;fingerprint:string;action:'skip'|'new';existingId?:string;confirmDistinct?:boolean;}
export const previewTransactionImport=(transactions:Omit<Transaction,'id'>[])=>financeWrite<ImportCandidate[]>('bank-transaction-import-preview','POST',{transactions});
