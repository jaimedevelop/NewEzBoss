import { useEffect, useState } from 'react';
export default function FinanceConnectionNotice(){
 const [error,setError]=useState('');
 useEffect(()=>{const failed=(event:Event)=>setError((event as CustomEvent<string>).detail);window.addEventListener('ezboss:finance-error',failed);return()=>window.removeEventListener('ezboss:finance-error',failed);},[]);
 return error?<div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl bg-red-50 p-4 text-red-800 shadow-lg">Finance data could not refresh: {error}. Check your connection and reopen the page. <button onClick={()=>setError('')} className="underline">Dismiss</button></div>:null;
}
