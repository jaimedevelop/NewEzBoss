import { useEffect, useState } from 'react';
import { reportsRequest } from '../../services/reports/api';
export function ReportsBadge() {
    const [count, setCount] = useState(0);
    const [unavailable, setUnavailable] = useState(false);
    useEffect(() => { let live = true; const update = () => { if (document.hidden)
        return; void reportsRequest<{
        unread: number;
    }>('/summary').then(data => { if (live) {
        setCount(data.unread);
        setUnavailable(false);
    } }).catch(() => { if (live)
        setUnavailable(true); }); }; update(); const timer = setInterval(update, 60000); window.addEventListener('reports-changed', update); return () => { live = false; clearInterval(timer); window.removeEventListener('reports-changed', update); }; }, []);
    if (unavailable)
        return <span aria-label="Report notification status unavailable. Open Reports to verify administrator access or retry." title="Open Reports to verify access or retry notifications" className="ml-auto rounded-full bg-slate-600 px-2 py-0.5 text-xs text-white">!</span>;
    return count > 0 ? <span aria-label={`${count} unread reports and system errors`} className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</span> : null;
}
