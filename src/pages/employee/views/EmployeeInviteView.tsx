import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exchangeEmployeeInvite, saveEmployeeSession } from '../../../services/employee/employeeApi';

export const employeeInvitationErrorMessage = (status?: number) => {
  if (status === 401) return 'This job link is invalid, expired, or no longer available. Ask your contractor for a new invitation.';
  if (status === 429) return 'Too many attempts were made. Please wait a moment and try again.';
  return 'We could not open your job right now. Please try again shortly.';
};

const EmployeeInviteView: React.FC = () => {
  const { token = '' } = useParams(); const navigate = useNavigate(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const accept = async () => { setBusy(true); setError(''); try { const session = await exchangeEmployeeInvite(token); saveEmployeeSession(session.token); window.history.replaceState({}, '', '/employee'); navigate('/employee', { replace: true }); } catch (error) { setError(employeeInvitationErrorMessage(typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined)); } finally { setBusy(false); } };
  return <Shell title="You’ve been invited to a job"><p className="text-gray-600">Accept this link to securely open your assigned job. Your contractor account is never shared with you.</p>{error && <Alert>{error}</Alert>}<button onClick={() => void accept()} disabled={busy} className="primary">{busy ? 'Opening job…' : 'Accept invitation'}</button><p className="text-xs text-gray-500">For your privacy, the invitation code is removed from this browser’s address after acceptance.</p></Shell>;
};
export const Shell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-14"><section className="mx-auto max-w-lg rounded-2xl bg-white p-5 sm:p-8 shadow-sm border border-slate-200 space-y-5"><div><p className="text-sm font-semibold text-orange-600">EzBoss Employee Portal</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1></div>{children}</section></main>;
export const Alert: React.FC<{ children: React.ReactNode }> = ({ children }) => <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{children}</div>;
export default EmployeeInviteView;
