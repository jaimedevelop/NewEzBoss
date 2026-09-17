import React, { useState } from 'react';
import { saveEmployeeOnboarding } from '../../../services/employee/employeeApi';
import type { EmployeePortal } from '../../../services/employee/employee.types';
import { Alert, Shell } from './EmployeeInviteView';
const EmployeeOnboardingView: React.FC<{ portal: EmployeePortal; onSaved: (value: EmployeePortal) => void }> = ({ portal, onSaved }) => {
  const [firstName, setFirstName] = useState(portal.profile.firstName || ''); const [lastName, setLastName] = useState(portal.profile.lastName || ''); const [phone, setPhone] = useState(portal.profile.phone || ''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { onSaved(await saveEmployeeOnboarding({ firstName, lastName, phone })); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save your details. Check your connection and try again.'); } finally { setBusy(false); } };
  return <Shell title="A few details before you begin"><p className="text-sm text-gray-600">Your email is already on file: <strong>{portal.profile.email || 'Email not available'}</strong></p><form onSubmit={submit} className="space-y-4">{error && <Alert>{error}</Alert>}<Field label="First name" value={firstName} setValue={setFirstName} /><Field label="Last name" value={lastName} setValue={setLastName} /><Field label="Phone" value={phone} setValue={setPhone} type="tel" /><button disabled={busy} className="primary w-full">{busy ? 'Saving…' : 'Open my job'}</button></form></Shell>;
};
const Field: React.FC<{ label: string; value: string; setValue: (v: string) => void; type?: string }> = ({ label, value, setValue, type = 'text' }) => <label className="block text-sm font-medium text-slate-800">{label}<input required type={type} autoComplete={type === 'tel' ? 'tel' : 'name'} value={value} onChange={e => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base" /></label>;
export default EmployeeOnboardingView;
