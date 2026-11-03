import { useEffect, useState } from 'react';
export default function FinanceConnectionNotice() {
 const [errors, setErrors] = useState<Record<string, string>>({});
 useEffect(() => {
  const failed = (event: Event) => {
   const {kind, message} = (event as CustomEvent<{kind:string;message:string}>).detail;
   setErrors(current => ({...current, [kind]:message}));
  };
  const writeFailed = (event: Event) => setErrors(current => ({...current, write:(event as CustomEvent<string>).detail}));
  const recovered = (event: Event) => {
   const kind = (event as CustomEvent<string>).detail;
   setErrors(current => {if (!(kind in current)) return current; const next = {...current}; delete next[kind]; return next;});
  };
  window.addEventListener('ezboss:finance-write-error', writeFailed);
  window.addEventListener('ezboss:finance-read-error', failed);
  window.addEventListener('ezboss:finance-recovered', recovered);
  return () => {window.removeEventListener('ezboss:finance-write-error', writeFailed); window.removeEventListener('ezboss:finance-read-error', failed); window.removeEventListener('ezboss:finance-recovered', recovered);};
 }, []);
 const error = Object.values(errors)[0];
 return error ? <div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl bg-red-50 p-4 text-red-800 shadow-lg">Finance data could not refresh: {error}. {errors.write ? 'Try the action again.' : 'Retrying automatically.'} <button onClick={() => setErrors({})} className="underline">Dismiss</button></div> : null;
}
