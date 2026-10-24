import { InputField } from '../../mainComponents/forms/InputField';
import CellDetails from './CellDetails';
import LinkedPaymentCell, { paymentCellText } from './LinkedPaymentCell';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { DollarSign, Search, Plus, Upload, Loader2, FileText, Trash2, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown } from 'lucide-react';
import { formatPayment, paymentInput } from './payment';
import { dateInput } from './dateTime';
import { nextFinanceSort, sortFinanceRows, type FinanceSort } from './financeSort';
import { useFinanceAutosave } from './useFinanceAutosave';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import { clientsApiRequest as request } from '../../services/clients/clientsApi';
import { useAuthContext } from '../../contexts/AuthContext';
import { columns, emptyData, matchColumns, mapRows, readImport, type Field, type ImportSheet, type LedgerRow, type RowData } from './ledger';

const button = 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50';
const cellInput = 'h-7 w-full min-w-0 border-0 bg-transparent px-2 text-xs text-gray-500 placeholder:text-gray-300 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-default disabled:opacity-75';
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';

export default function Finances() {
  const { currentUser, canPerform, membershipId } = useAuthContext();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentFocus, setPaymentFocus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');
  const [columnSort, setColumnSort] = useState<FinanceSort | null>(null);
  const autosave = useFinanceAutosave(`${currentUser?.uid ?? 'signed-out'}:${membershipId ?? 'default'}`, !!currentUser && canPerform('write:finances') && !loading && !loadFailed);
  const [sheets, setSheets] = useState<ImportSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Record<Field, string>>(matchColumns([]));
  const pendingImport = useRef<{ signature: string; records: { id: string; data: RowData }[] } | null>(null);
  const [deleteRow, setDeleteRow] = useState<LedgerRow | null>(null);

  useEffect(() => {
    let active = true;
    setRows([]); setLoading(true); setLoadFailed(false); setError('');
    setSheets([]); setDeleteRow(null);
    if (!currentUser?.uid) { setLoading(false); return; }
    request<LedgerRow[]>('/finance-records').then(data => { if (active) setRows(data); })
      .catch(err => { if (active) { setError(err.message); setLoadFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    const refresh = () => {
      request<LedgerRow[]>('/finance-records').then(data => {
        if (active) setRows(previous => {
          const summaries = new Map(data.map(row => [row.id, row.paymentSummary]));
          return previous.map(row => ({ ...row, paymentSummary: summaries.get(row.id) ?? row.paymentSummary }));
        });
      }).catch(() => {});
    };
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [currentUser?.uid, membershipId, reload]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save records.'); }
    finally { setBusy(false); }
  }
  const sheet = sheets[sheetIndex];
  const preview = sheet ? mapRows(sheet, mapping) : [];
  const mapped = Object.values(mapping).filter(Boolean);
  const duplicateMapping = new Set(mapped).size !== mapped.length;
  const oversized = new TextEncoder().encode(JSON.stringify({ records: preview.map(data => ({ id: '00000000-0000-4000-8000-000000000000', data })) })).length > 900000;
  const paymentSummaries = new Map(rows.map(row => [row.id, row.paymentSummary]));
  const mergedRows = [...new Map([...rows, ...autosave.savedRows, ...Object.values(autosave.drafts)].map(row => [row.id, row])).values()].map(row => ({ ...row, paymentSummary: paymentSummaries.get(row.id) ?? row.paymentSummary }));
  const filtered = mergedRows.filter(row => Object.entries(row.data).some(([key, value]) => (row.paymentSummary && ['payment', 'paymentMethod', 'paymentDate'].includes(key) ? paymentCellText(row.paymentSummary, key as Field) : value).toLowerCase().includes(search.toLowerCase())));

  const dateSorted = sortFinanceRows(filtered, { column: 'date', direction: dateSort });
  const visible = columnSort ? sortFinanceRows(dateSorted, columnSort) : dateSorted;
  const activeSort = columnSort ?? { column: 'date', direction: dateSort };

  const sortHeader = (key: Field, label: string) => {
    const active = activeSort.column === key;
    const Icon = active ? activeSort.direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown;
    const next = nextFinanceSort(columnSort, key);
    const nextLabel = next ? next.direction === 'asc' ? 'ascending' : 'descending' : 'default date order';
    return <th key={key} scope="col" aria-sort={active ? activeSort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} className={`h-8 whitespace-nowrap border-b border-r border-gray-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${active ? 'text-orange-700' : ''}`}>
      <button type="button" onClick={() => setColumnSort(next)} aria-label={`${label}: ${active ? activeSort.direction === 'asc' ? 'Ascending' : 'Descending' : 'Unsorted'}. Click for ${nextLabel}`} title={`Click for ${nextLabel}`} className="flex w-full items-center gap-1 rounded text-left uppercase hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
        {label}<Icon aria-hidden="true" className={`h-3 w-3 shrink-0 ${active ? '' : 'opacity-40'}`} />
      </button>
    </th>;
  };


  return <div className="space-y-8">
    <VariableHeader title="Finances" subtitle="Manage your company’s finance records." Icon={DollarSign} />
    <div className="max-w-7xl mx-auto space-y-6">
    <div hidden={autosave.status === 'idle'} role="status" aria-live="polite" className={`${autosave.status === 'idle' ? 'hidden' : 'flex'} min-h-5 items-center gap-2 text-xs ${autosave.status === 'failed' ? 'text-red-700' : autosave.status === 'saved' ? 'text-green-700' : 'text-gray-600'}`}>
      {autosave.status === 'saving' && <><Loader2 size={14} className="animate-spin" />Saving...</>}
      {autosave.status === 'saved' && 'Autosaved.'}
      {autosave.status === 'failed' && <>Failed to save <span>{autosave.storageFailed ? '— changes remain on this page.' : '— changes kept locally.'}</span><button className="underline" onClick={autosave.retry}>Retry</button></>}
    </div>
    {autosave.storageFailed && <p role="alert" className="text-xs text-red-700">Browser storage is unavailable. Keep this page open until changes are saved.</p>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {loadFailed && <button className={button} onClick={() => setReload(value => value + 1)}>Retry loading</button>}
    {notice && <div role="status" className="text-sm text-green-700">{notice}</div>}
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
      <div className="relative flex-1 min-w-0">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <InputField className="pl-10 pr-10" aria-label="Search finance records" aria-describedby="finance-search-hint" placeholder="Search records..." value={search} onChange={event => setSearch(event.target.value)} />
          {search && <button type="button" aria-label="Clear record search" onClick={event => { setSearch(''); event.currentTarget.parentElement?.querySelector('input')?.focus(); }} className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"><X aria-hidden="true" className="h-4 w-4" /></button>}
        </div>
        <p id="finance-search-hint" className="mt-1.5 text-xs text-gray-500">Search by estimate or invoice number, P.O. number, customer, service address, payment, method, date, or agent.</p>
      </div>
      <div className="relative w-full self-start md:w-48 md:shrink-0">
        <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
        <select aria-label="Sort finance records by date" value={columnSort ? '' : dateSort} onChange={event => { setDateSort(event.target.value as 'asc' | 'desc'); setColumnSort(null); }} className="block w-full appearance-none rounded-md border border-orange-200 bg-orange-50 py-2 pl-9 pr-8 text-sm font-medium leading-5 text-orange-700 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
          {columnSort && <option value="" disabled>Column sort</option>}
          <option value="asc">Date Ascending</option>
          <option value="desc">Date Descending</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
      </div>
      <div className="flex shrink-0 items-start gap-2">
        <label className={`${button} cursor-pointer bg-white ${busy || loading ? 'opacity-50' : ''}`}><Upload size={16} /> Import file
          <input type="file" className="sr-only" accept=".xlsx,.xls,.csv,.json" disabled={!canPerform('write:finances') || busy || loading || loadFailed || !currentUser} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (file) void run(async () => { const result = await readImport(file); if (!result.some(item => item.rows.length)) throw new Error('The file has no data rows.'); pendingImport.current = null; setSheets(result); setSheetIndex(0); setMapping(matchColumns(result[0].headers)); });
          }} />
        </label>
        <button aria-label="Add row" title="Add row" className="inline-flex items-center justify-center rounded-lg border border-orange-600 bg-orange-600 p-2 text-white hover:bg-orange-700 disabled:opacity-50" disabled={!canPerform('write:finances') || busy || loading || loadFailed || !currentUser} onClick={() => { setSearch(''); setRows(previous => [...previous, { id: crypto.randomUUID(), version: 0, data: emptyData() }]); }}><Plus size={20} /></button>
      </div>
    </div>
    <div className="space-y-2">
    {!canPerform('write:finances') && <p className="text-xs text-gray-500">Finance records are read-only.</p>}
    <p className="text-sm text-gray-500" role="status">{visible.length} of {mergedRows.length} rows</p>
    </div>
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse text-left text-xs" style={{ minWidth: 1544 }}>
        <colgroup>{columns.map(([key]) => <col key={key} style={{ width: ['date', 'paymentDate', 'jobCompletionDate'].includes(key) ? 112 : key === 'estimate' || key === 'invoice' ? 160 : key === 'serviceAddress' ? 220 : key === 'completedFor' ? 180 : key === 'paymentMethod' || key === 'poNumber' ? 120 : 100 }} />)}<col style={{ width: 48 }} /></colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500"><tr>{columns.map(([key, label]) => sortHeader(key, key === 'jobCompletionDate' ? 'Completion Date' : label))}<th scope="col" className="border-b border-gray-200 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider">Actions</th></tr></thead>
        <tbody>{visible.map(row => <tr key={row.id} className="group transition-colors hover:bg-gray-50 focus-within:bg-blue-50/40">
          {columns.map(([key, label]) => {
            const isDocument = key === 'estimate' || key === 'invoice';
            const documentId = key === 'estimate' ? row.estimateId : key === 'invoice' ? row.invoiceId : null;
            const isDate = ['date', 'paymentDate', 'jobCompletionDate'].includes(key);
            const dateValue = row.data[key];
            const normalizedDate = isDate ? dateInput(dateValue) : '';
            const validDate = !dateValue || !!normalizedDate;
            const cell = <input aria-label={label} placeholder={isDate ? undefined : '—'} title={isDate && !validDate ? `Existing date: ${dateValue}. Enter a date to replace it.` : undefined} type={isDate ? 'date' : 'text'} inputMode={key === 'payment' ? 'decimal' : undefined} className={`${cellInput} ${key === 'payment' ? '!text-gray-900 text-right font-semibold tabular-nums' : isDocument ? '!text-blue-600 font-semibold' : key === 'completedFor' ? '!text-gray-900 font-semibold' : ''}`} maxLength={2000} disabled={busy || !canPerform('write:finances') || (key === 'jobCompletionDate' && !!(row.estimateId || row.invoiceId))} value={isDate ? validDate ? normalizedDate : '' : key === 'payment' ? paymentFocus === row.id ? paymentInput(row.data[key]) : formatPayment(row.data[key]) : row.data[key]} onFocus={() => { if (key === 'payment') setPaymentFocus(row.id); }} onBlur={() => { if (key === 'payment') { setPaymentFocus(null); const formatted = formatPayment(row.data[key]); if (formatted !== row.data[key]) autosave.change(row, { ...row.data, payment: formatted }); } }} onChange={event => autosave.change(row, { ...row.data, [key]: event.target.value })} />;
            return <td key={key} className="h-7 border-b border-r border-gray-100 p-0 align-middle">
              <div className="flex h-7 min-w-0 items-center">
              {isDocument && <FileText size={13} aria-hidden="true" className="ml-2 shrink-0 text-blue-500" />}
              {row.paymentSummary && ['payment', 'paymentMethod', 'paymentDate'].includes(key) ? <LinkedPaymentCell summary={row.paymentSummary} field={key} /> : documentId ? <CellDetails value={row.data[key]} overflowOnly><Link to={`/estimates/${encodeURIComponent(documentId)}`} aria-label={`Open ${label.toLowerCase()} ${row.data[key]}`} className="block truncate px-2 py-1 font-medium text-orange-600 hover:underline" >{row.data[key] || `Open ${label.toLowerCase()}`}</Link></CellDetails> : <CellDetails value={key === 'payment' ? formatPayment(row.data[key]) : isDate && validDate ? normalizedDate : row.data[key]} overflowOnly>{cell}</CellDetails>}
              </div>
              {isDate && !validDate && <span className="block truncate px-2 text-xs text-gray-500" title={dateValue}>{dateValue}</span>}
            </td>;
          })}
          <td className="border-b border-gray-100 px-2 py-0"><div className="flex h-7 items-center justify-center gap-2"><button className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40" aria-label="Delete row" title={autosave.drafts[row.id] ? 'Save pending changes before deleting' : 'Delete row'} disabled={busy || !!autosave.drafts[row.id] || !canPerform('delete:finances')} onClick={() => {
            if (row.version === 0) setRows(previous => previous.filter(item => item.id !== row.id));
            else setDeleteRow(row);
          }}><Trash2 size={14} /></button></div></td>
        </tr>)}</tbody>
      </table>
      {!visible.length && <div className="p-8 text-center text-sm text-gray-500">{loading ? 'Loading records…' : rows.length ? 'No matching records.' : 'No finance records yet. Import your spreadsheet or add your first row.'}</div>}
    </div>
    </div>
    {(sheet || deleteRow) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between"><h2 id="finance-dialog-title" className="text-lg font-semibold">{deleteRow ? 'Delete finance record?' : 'Match import columns'}</h2><button aria-label="Close dialog" disabled={busy} onClick={() => { setSheets([]); setDeleteRow(null); }}><X size={20} /></button></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      {deleteRow && <><p className="text-sm text-gray-600">This will permanently remove this row from your finances table.</p><div className="mt-6 flex justify-end gap-3"><button className={button} disabled={busy} onClick={() => setDeleteRow(null)}>Cancel</button><button className={`${button} bg-red-600 text-white`} disabled={busy || !canPerform('delete:finances')} onClick={() => void run(async () => { await request(`/finance-records/${deleteRow.id}`, { method: 'DELETE' }); setRows(previous => previous.filter(row => row.id !== deleteRow.id)); autosave.forget(deleteRow.id); setDeleteRow(null); setNotice('Row deleted.'); })}>Delete row</button></div></>}
      {sheet && <>
        <p className="mb-4 text-sm text-gray-600">Choose which source column fills each table column. Unmatched columns can be skipped. Imports append rows to your existing records.</p>
        <label className="mb-5 block text-sm font-medium">Worksheet<select className={`${input} mt-1`} value={sheetIndex} disabled={busy} onChange={event => { const index = Number(event.target.value); setSheetIndex(index); setMapping(matchColumns(sheets[index].headers)); }}>{sheets.map((item, index) => <option key={index} value={index}>{item.name} ({item.rows.length} rows)</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{columns.map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<select className={`${input} mt-1`} disabled={busy} value={mapping[key]} onChange={event => setMapping({ ...mapping, [key]: event.target.value })}><option value="">Skip / leave blank</option>{sheet.headers.map((header, index) => <option key={index} value={index}>{header} (column {index + 1})</option>)}</select></label>)}</div>
        <p className="mb-2 mt-5 text-sm font-medium">Preview · {preview.length} rows to import</p>
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="bg-gray-50"><tr>{columns.map(([key, label]) => <th key={key} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead><tbody>{preview.slice(0, 5).map((row, index) => <tr key={index}>{columns.map(([key]) => <td key={key} className="max-w-xs truncate p-2">{row[key] || '—'}</td>)}</tr>)}</tbody></table></div>
        {duplicateMapping && <p role="alert" className="mt-3 text-sm text-red-700">Match each source column only once.</p>}
        {preview.some(row => Object.values(row).some(value => value.length > 2000)) && <p role="alert" className="mt-3 text-sm text-red-700">Some cells exceed 2,000 characters. Shorten them before importing.</p>}
        {(preview.length > 1000 || oversized) && <p role="alert" className="mt-3 text-sm text-red-700">This import is too large. Split it into files with at most 1,000 rows and less than 900 KB of mapped data.</p>}
        <div className="mt-6 flex justify-end"><button className={`${button} bg-blue-600 text-white`} disabled={!canPerform('write:finances') || busy || !preview.length || duplicateMapping || preview.length > 1000 || oversized || preview.some(row => Object.values(row).some(value => value.length > 2000))} onClick={() => void run(async () => {
          const signature = JSON.stringify(preview);
          if (pendingImport.current?.signature !== signature) pendingImport.current = { signature, records: preview.map(data => ({ id: crypto.randomUUID(), data })) };
          await request<LedgerRow[]>('/finance-records', { method: 'POST', body: JSON.stringify({ records: pendingImport.current.records }) });
          const saved = await request<LedgerRow[]>('/finance-records');
          setRows(saved); pendingImport.current = null; setSheets([]); setNotice(`Imported ${preview.length} rows.`);
        })}>{busy ? 'Importing…' : `Import ${preview.length} rows`}</button></div>
      </>}
    </section></div>}
  </div>;
}
