import { useEffect, useRef, useState } from 'react';
import { DollarSign, Plus, Upload, Pencil, Trash2, X } from 'lucide-react';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import { clientsApiRequest as request } from '../../services/clients/clientsApi';
import { useAuthContext } from '../../contexts/AuthContext';
import { columns, emptyData, matchColumns, mapRows, readImport, type Field, type ImportSheet, type LedgerRow, type RowData } from './ledger';

const button = 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50';
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900';

export default function Finances() {
  const { currentUser } = useAuthContext();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ row?: LedgerRow; data: RowData } | null>(null);
  const [sheets, setSheets] = useState<ImportSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Record<Field, string>>(matchColumns([]));
  const pendingImport = useRef<{ signature: string; records: { id: string; data: RowData }[] } | null>(null);
  const [deleteRow, setDeleteRow] = useState<LedgerRow | null>(null);

  useEffect(() => {
    let active = true;
    setRows([]); setLoading(true); setLoadFailed(false); setError('');
    setEditor(null); setSheets([]); setDeleteRow(null);
    if (!currentUser) { setLoading(false); return; }
    request<LedgerRow[]>('/finance-records').then(data => { if (active) setRows(data); })
      .catch(err => { if (active) { setError(err.message); setLoadFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser?.uid, reload]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save records.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!editor) return;
    await run(async () => {
      if (editor.row) {
        const saved = await request<LedgerRow>(`/finance-records/${editor.row.id}`, { method: 'PUT', body: JSON.stringify({ data: editor.data, version: editor.row.version }) });
        setRows(previous => previous.map(row => row.id === saved.id ? saved : row));
      } else {
        const saved = await request<LedgerRow[]>('/finance-records', { method: 'POST', body: JSON.stringify({ records: [{ id: crypto.randomUUID(), data: editor.data }] }) });
        setRows(previous => [...previous, ...saved]);
      }
      setEditor(null); setNotice('Row saved.');
    });
  }
  const sheet = sheets[sheetIndex];
  const preview = sheet ? mapRows(sheet, mapping) : [];
  const mapped = Object.values(mapping).filter(Boolean);
  const duplicateMapping = new Set(mapped).size !== mapped.length;
  const oversized = new TextEncoder().encode(JSON.stringify({ records: preview.map(data => ({ id: '00000000-0000-4000-8000-000000000000', data })) })).length > 900000;
  const visible = rows.filter(row => Object.values(row.data).some(value => value.toLowerCase().includes(search.toLowerCase())));

  return <div className="space-y-6">
    <VariableHeader title="Finances" subtitle="Manage your company’s finance records." Icon={DollarSign} />
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {loadFailed && <button className={button} onClick={() => setReload(value => value + 1)}>Retry loading</button>}
    {notice && <div role="status" className="text-sm text-green-700">{notice}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><input className={input} aria-label="Search finance records" placeholder="Search records…" value={search} onChange={event => setSearch(event.target.value)} /><span className="whitespace-nowrap text-sm text-gray-500">{visible.length} of {rows.length} rows</span></div>
      <div className="flex gap-2">
        <label className={`${button} cursor-pointer bg-white ${busy || loading ? 'opacity-50' : ''}`}><Upload size={16} /> Import file
          <input type="file" className="sr-only" accept=".xlsx,.xls,.csv,.json" disabled={busy || loading || loadFailed || !currentUser} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (file) void run(async () => { const result = await readImport(file); if (!result.some(item => item.rows.length)) throw new Error('The file has no data rows.'); pendingImport.current = null; setSheets(result); setSheetIndex(0); setMapping(matchColumns(result[0].headers)); });
          }} />
        </label>
        <button className={`${button} border-blue-600 bg-blue-600 text-white`} disabled={busy || loading || loadFailed || !currentUser} onClick={() => setEditor({ data: emptyData() })}><Plus size={16} /> Add row</button>
      </div>
    </div>
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr>{columns.map(([key, label]) => <th key={key} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>)}<th scope="col" className="px-4 py-3">Actions</th></tr></thead>
        <tbody className="divide-y">{visible.map(row => <tr key={row.id} className="hover:bg-gray-50">{columns.map(([key]) => <td key={key} className="min-w-[140px] max-w-xs whitespace-pre-wrap break-words px-4 py-3">{row.data[key] || <span className="text-gray-300">—</span>}</td>)}<td className="px-4 py-3"><div className="flex gap-3"><button aria-label="Edit row" disabled={busy} onClick={() => setEditor({ row, data: { ...row.data } })}><Pencil size={16} /></button><button aria-label="Delete row" disabled={busy} onClick={() => setDeleteRow(row)}><Trash2 size={16} className="text-red-600" /></button></div></td></tr>)}</tbody>
      </table>
      {!visible.length && <div className="p-12 text-center text-gray-500">{loading ? 'Loading records…' : rows.length ? 'No matching records.' : 'No finance records yet. Import your spreadsheet or add your first row.'}</div>}
    </div>
    {(editor || sheet || deleteRow) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="finance-dialog-title" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between"><h2 id="finance-dialog-title" className="text-lg font-semibold">{editor ? editor.row ? 'Edit finance record' : 'Add finance record' : deleteRow ? 'Delete finance record?' : 'Match import columns'}</h2><button aria-label="Close dialog" disabled={busy} onClick={() => { setEditor(null); setSheets([]); setDeleteRow(null); }}><X size={20} /></button></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      {editor && <form onSubmit={event => { event.preventDefault(); void save(); }}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{columns.map(([key, label]) => <label key={key} className="space-y-1 text-sm font-medium"><span>{label}</span><input autoFocus={key === 'date'} className={input} maxLength={2000} value={editor.data[key]} onChange={event => setEditor({ ...editor, data: { ...editor.data, [key]: event.target.value } })} /></label>)}</div><div className="mt-6 flex justify-end"><button type="submit" className={`${button} bg-blue-600 text-white`} disabled={busy || !Object.values(editor.data).some(value => value.trim())}>{busy ? 'Saving…' : 'Save row'}</button></div></form>}
      {deleteRow && <><p className="text-sm text-gray-600">This will permanently remove this row from your finances table.</p><div className="mt-6 flex justify-end gap-3"><button className={button} disabled={busy} onClick={() => setDeleteRow(null)}>Cancel</button><button className={`${button} bg-red-600 text-white`} disabled={busy} onClick={() => void run(async () => { await request(`/finance-records/${deleteRow.id}`, { method: 'DELETE' }); setRows(previous => previous.filter(row => row.id !== deleteRow.id)); setDeleteRow(null); setNotice('Row deleted.'); })}>Delete row</button></div></>}
      {sheet && <>
        <p className="mb-4 text-sm text-gray-600">Choose which source column fills each table column. Unmatched columns can be skipped. Imports append rows to your existing records.</p>
        <label className="mb-5 block text-sm font-medium">Worksheet<select className={`${input} mt-1`} value={sheetIndex} disabled={busy} onChange={event => { const index = Number(event.target.value); setSheetIndex(index); setMapping(matchColumns(sheets[index].headers)); }}>{sheets.map((item, index) => <option key={index} value={index}>{item.name} ({item.rows.length} rows)</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{columns.map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<select className={`${input} mt-1`} disabled={busy} value={mapping[key]} onChange={event => setMapping({ ...mapping, [key]: event.target.value })}><option value="">Skip / leave blank</option>{sheet.headers.map((header, index) => <option key={index} value={index}>{header} (column {index + 1})</option>)}</select></label>)}</div>
        <p className="mb-2 mt-5 text-sm font-medium">Preview · {preview.length} rows to import</p>
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="bg-gray-50"><tr>{columns.map(([key, label]) => <th key={key} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead><tbody>{preview.slice(0, 5).map((row, index) => <tr key={index}>{columns.map(([key]) => <td key={key} className="max-w-xs truncate p-2">{row[key] || '—'}</td>)}</tr>)}</tbody></table></div>
        {duplicateMapping && <p role="alert" className="mt-3 text-sm text-red-700">Match each source column only once.</p>}
        {preview.some(row => Object.values(row).some(value => value.length > 2000)) && <p role="alert" className="mt-3 text-sm text-red-700">Some cells exceed 2,000 characters. Shorten them before importing.</p>}
        {(preview.length > 1000 || oversized) && <p role="alert" className="mt-3 text-sm text-red-700">This import is too large. Split it into files with at most 1,000 rows and less than 900 KB of mapped data.</p>}
        <div className="mt-6 flex justify-end"><button className={`${button} bg-blue-600 text-white`} disabled={busy || !preview.length || duplicateMapping || preview.length > 1000 || oversized || preview.some(row => Object.values(row).some(value => value.length > 2000))} onClick={() => void run(async () => {
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
