import { financeList, financeSubscribe } from '../financeApi';
import type { BankAccount, DatabaseResult, BankResponse } from './bank.types';
export async function getBankAccounts(_userId:string):Promise<DatabaseResult<BankResponse>> {try{return {success:true,data:{accounts:(await financeList<BankAccount>('bank-accounts')).filter(a=>a.isActive)}};}catch(error){return {success:false,error:String(error)};}}
export const subscribeToBankAccounts=(_userId:string,callback:(rows:BankAccount[])=>void,onError?:(message:string)=>void)=>financeSubscribe('bank-accounts',callback,(a:BankAccount)=>a.isActive,onError);

export async function getReferencedBankAccount(id:string):Promise<BankAccount|undefined>{return (await financeList<BankAccount>('bank-accounts',`id=${encodeURIComponent(id)}`))[0];}
export function subscribeToEstimateBankAccounts(_uid:string,currentId:string|undefined,callback:(rows:BankAccount[])=>void,onError?:(message:string)=>void){
 return financeSubscribe<BankAccount>('bank-accounts',rows=>callback(rows.filter(a=>a.isActive||a.id===currentId)),undefined,onError);
}
