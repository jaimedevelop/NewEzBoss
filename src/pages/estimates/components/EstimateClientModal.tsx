import { useState } from 'react';
import { X } from 'lucide-react';
import { type Estimate } from '../../../services/estimates';
import { FormField } from '../../../mainComponents/forms/FormField';
import { InputField } from '../../../mainComponents/forms/InputField';

const fields = [
  ['customerName', 'Name'], ['customerEmail', 'Email'], ['customerPhone', 'Phone'],
  ['serviceAddress', 'Service Address'], ['serviceAddress2', 'Suite / Apt'],
  ['serviceCity', 'City'], ['serviceState', 'State'], ['serviceZipCode', 'Zip Code']
] as const;
type ClientDetails = { [Key in typeof fields[number][0]]: string };
type ClientValue = Pick<Estimate, typeof fields[number][0]>;

export default function EstimateClientModal({ value, readOnly = false, onClose, onChangeClient, onSave }: {
  value: ClientValue;
  readOnly?: boolean;
  onClose: () => void;
  onChangeClient: () => void;
  onSave: (value: ClientDetails) => Promise<boolean> | boolean;
}) {
  const [draft, setDraft] = useState<ClientDetails>(() => Object.fromEntries(fields.map(([key]) => [key, value[key] || ''])) as ClientDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!draft.customerName.trim()) { setError('Client name is required.'); return; }
    setSaving(true);
    try {
      if (await onSave(draft)) onClose();
      else setError('Could not save client details. Please try again.');
    } catch { setError('Could not save client details. Please try again.'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onKeyDown={e => { if (e.key === 'Escape' && !saving) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="estimate-client-title" className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="estimate-client-title" className="text-lg font-semibold">{readOnly ? 'Client' : 'Edit Client'}</h2>
        <button type="button" aria-label="Close client details" disabled={saving} onClick={onClose}><X className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(([key, label], index) => <FormField key={key} label={label} required={key === 'customerName'}>
          <InputField autoFocus={index === 0} type={key === 'customerEmail' ? 'email' : key === 'customerPhone' ? 'tel' : 'text'} value={draft[key] || ''} disabled={readOnly || saving} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} />
        </FormField>)}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex justify-between gap-3">
        {!readOnly && <button type="button" disabled={saving} onClick={onChangeClient} className="text-sm font-medium text-orange-600">Change Client</button>}
        <button type="button" disabled={saving} onClick={readOnly ? onClose : save} className="ml-auto rounded-lg bg-orange-600 px-4 py-2 text-sm text-white disabled:opacity-50">{readOnly ? 'Close' : saving ? 'Saving…' : 'Save Client'}</button>
      </div>
    </div>
  </div>;
}
