import { collectionsApiRequest } from '../collections/collectionsApi';
import { companyCacheScope } from '../companySession';
export interface DatabaseResult<T = any> { success: boolean; data?: T; id?: string; error?: any; }
const changed = 'ezboss:finance-changed';
export async function financeList<T>(kind:string,query=''):Promise<T[]> {
 const scope=companyCacheScope();const result:T[]=[];
 for(let offset=0;;offset+=500){if(scope!==companyCacheScope())throw new Error('Company changed');const page=await collectionsApiRequest<T[]>(`/legacy-finance/${kind}?limit=500&offset=${offset}${query?'&'+query:''}`);if(scope!==companyCacheScope())throw new Error('Company changed');result.push(...page);if(page.length<500)return result;}
}
export async function financeWrite<T=any>(kind:string,method:string,data?:unknown,id?:string):Promise<T> {
 const scope=companyCacheScope();
 const result=await collectionsApiRequest<T>(`/legacy-finance/${kind}${id?'/'+encodeURIComponent(id):''}`,{method,...(data?{body:JSON.stringify(data)}:{})});
 if(scope!==companyCacheScope())throw new Error('Company changed');
 window.dispatchEvent(new Event(changed));return result;
}
export async function financeResult(action:()=>Promise<any>):Promise<DatabaseResult> {
 try {const data=await action();return {success:true,data:data?.id??data,id:data?.id};}catch(error){const message=error instanceof Error?error.message:String(error);window.dispatchEvent(new CustomEvent('ezboss:finance-error',{detail:message}));return {success:false,error:message};}
}
export function financeSubscribe<T>(kind:string,callback:(rows:T[])=>void,filter:(row:T)=>boolean=()=>true,onError?:(message:string)=>void,query='') {
 let active=true;let running=false;let dirty=false;const scope=companyCacheScope();
 const refresh=async()=>{if(!active||scope!==companyCacheScope())return;if(running){dirty=true;return;}running=true;try{const rows=await financeList<T>(kind,query);if(active&&scope===companyCacheScope())callback(rows.filter(filter));}catch(error){if(active&&scope===companyCacheScope()){const message=error instanceof Error?error.message:String(error);onError?.(message);window.dispatchEvent(new CustomEvent('ezboss:finance-error',{detail:message}));}}finally{running=false;if(dirty&&active){dirty=false;void refresh();}}};
 void refresh();const timer=window.setInterval(refresh,30000);window.addEventListener(changed,refresh);window.addEventListener('focus',refresh);
 return ()=>{active=false;clearInterval(timer);window.removeEventListener(changed,refresh);window.removeEventListener('focus',refresh);};
}
// Parse date-only values in local calendar time, avoiding UTC midnight day shifts.
export function financeDate(value:string):Date {return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T00:00:00':value);}

export function localCalendarDay(date=new Date()):string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function paymentIsOverdue(value:string,now=new Date(),timeZone?:string):boolean {return value.length===10?value<calendarDay(now,timeZone):financeDate(value).getTime()<now.getTime();}
export function calendarMonthRange(year:number,month:number) {return {from:localCalendarDay(new Date(year,month,0)),to:localCalendarDay(new Date(year,month+1,1))};}

export function calendarDay(date:Date,timeZone?:string):string {
 if(!timeZone)return localCalendarDay(date);
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const value=(name:string)=>parts.find(p=>p.type===name)!.value;
 return `${value('year')}-${value('month')}-${value('day')}`;
}
