// src/pages/employees/components/EmployeesList.tsx

import { deliveryLabel, invitationTimestamp, type InvitationAction, type AccountInvitation } from '../../../services/employees/accountInvitations';
import React, { useState, useEffect, useMemo } from 'react';
import { useLetterNavigation } from '../hooks/useLetterNavigation';
import { Mail, Phone, MapPin, Edit2, Trash2, Calendar, DollarSign, UserCheck, UserX, AlertCircle, MailPlus, MailCheck, RefreshCw, Link2, XCircle } from 'lucide-react';
import { deleteEmployee, formatPhoneNumber, type Employee } from '../../../services/employees';

interface EmployeesListProps {
  allEmployees: Employee[];
  invitationBusy: boolean;
  onInvitationAction: (invitation: AccountInvitation, action: InvitationAction) => void;
  employeesGrouped: Record<string, Employee[]>;
  isLoading: boolean;
  searchTerm?: string;
  onEditEmployee: (employee: Employee) => void;
  invitations: AccountInvitation[];
  canInvite: boolean;
  onInviteEmployee: (employee: Employee) => void;
  onEmployeeDeleted: (employeeId: string) => void;
}

const EmployeesList: React.FC<EmployeesListProps> = ({
  employeesGrouped, allEmployees, invitationBusy, onInvitationAction,
  isLoading,
  searchTerm = '',
  onEditEmployee,
  onInviteEmployee, invitations, canInvite,
  onEmployeeDeleted,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, { until: number }>>(() => {
    try { return JSON.parse(sessionStorage.getItem('employee-invitation-resend-cooldowns') || '{}'); } catch { return {}; }
  });
  useEffect(() => {
    if (!Object.values(resendCooldowns).some(value => value.until > Date.now())) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldowns]);
  const matches = (i: AccountInvitation, employee: Employee) => i.employeeId === Number(employee.id) || (!i.employeeId && i.email.toLowerCase() === employee.email?.toLowerCase());
  const grouped = useMemo(() => {
  const groups = Object.fromEntries(Object.entries(employeesGrouped).map(([letter, items]) => [letter, [...items]]));
  invitations.filter(i => i.status === 'pending' || i.status === 'expired').forEach(i => {
    if (allEmployees.some(employee => matches(i, employee))) return;
    if (searchTerm && !i.email.toLowerCase().includes(searchTerm.toLowerCase())) return;
    const letter = i.email[0].toUpperCase();
    (groups[letter] ||= []).push({ id: `invitation:${i.id}`, name: i.email, email: i.email, userId: '' });
  });
  Object.values(groups).forEach(items => items.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
  return groups;
  }, [employeesGrouped, allEmployees, invitations, searchTerm]);
  const act = (invitation: AccountInvitation, action: InvitationAction) => {
    if (action === 'revoke' && !window.confirm('Revoke this invitation? The employee will no longer be able to accept it.')) return;
    if (action === 'resend') {
      const previous = resendCooldowns[invitation.id];
      if (previous && previous.until > Date.now()) return;
      const next = { ...resendCooldowns, [invitation.id]: { until: Date.now() + 30000 } };
      setResendCooldowns(next); setNow(Date.now());
      try { sessionStorage.setItem('employee-invitation-resend-cooldowns', JSON.stringify(next)); } catch { /* Countdown still works without session storage. */ }
    }
    onInvitationAction(invitation, action);
  };

  const { letters, activeLetter, listRef, sectionRefs, onScroll, jumpToLetter } =
    useLetterNavigation(grouped, searchTerm);

  const handleDelete = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${employeeName}?`)) {
      return;
    }

    setDeletingId(employeeId);
    const result = await deleteEmployee(employeeId);

    if (result.success) {
      onEmployeeDeleted(employeeId);
    } else {
      alert(result.error || 'Failed to delete employee');
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading employees...</div>
      </div>
    );
  }

  if (letters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No employees found</p>
          <p className="text-gray-400 text-sm mt-2">Click "Invite Employee" to invite your first employee</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[min(680px,65vh)] overflow-hidden">
      {/* Alphabetical Tabs */}
      <div className="w-12 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        {['All', ...letters].map(letter => (
          <button
            key={letter}
            aria-current={activeLetter === letter ? 'location' : undefined}
            onClick={() => jumpToLetter(letter)}
            className={`w-full py-2 text-sm font-semibold transition-colors ${activeLetter === letter
              ? 'bg-orange-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Employees List */}
      <div ref={listRef} onScroll={onScroll} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-6">
        <div className="space-y-4">
          {letters.map(letter => (
            <section className="last:min-h-[min(680px,65vh)]" key={letter} ref={element => { sectionRefs.current[letter] = element; }}>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">{letter}</h2>
              <div className="space-y-4">
          {grouped[letter].map(employee => {
            const invitation = invitations.find(i => matches(i, employee) && (i.status === 'pending' || i.status === 'expired')) || invitations.find(i => matches(i, employee));
            const pending = invitation && (invitation.status === 'pending' || invitation.status === 'expired');
            const temporary = employee.id?.startsWith('invitation:');
            const resendCooldown = invitation ? resendCooldowns[invitation.id] : undefined;
            const seconds = Math.max(0, Math.ceil(((resendCooldown?.until || 0) - now) / 1000));
            return (
            <div
              key={employee.id}
              data-person-card
              role={!temporary ? 'button' : undefined}
              tabIndex={!temporary ? 0 : undefined}
              aria-label={!temporary ? `Edit ${employee.name || 'Unnamed Employee'}` : undefined}
              onClick={event => {
                if (!temporary && !(event.target as HTMLElement).closest('a, button')) {
                  onEditEmployee(employee);
                }
              }}
              onKeyDown={event => {
                if (event.target === event.currentTarget && (!temporary) && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onEditEmployee(employee);
                }
              }}
              className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${!temporary ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Name and Employee ID */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {employee.name || 'Unnamed Employee'}
                    </h3>
                    {invitation?.status === 'pending' && (
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-2.5 py-1 text-xs font-medium text-white">
                        Invited
                      </span>
                    )}
                    {employee.employeeId && (
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {employee.employeeId}
                      </span>
                    )}
                    {employee.isComplete === false && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        <AlertCircle className="w-3 h-3" />
                        Incomplete
                      </span>
                    )}
                    {!temporary && (employee.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        <UserCheck className="w-3 h-3" />
                        Employment active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                        <UserX className="w-3 h-3" />
                        Employment inactive
                      </span>
                    ))}
                  </div>

                  {invitation?.status !== 'pending' && (
                    <p className="text-sm text-gray-600 mb-2">Account invitation: {invitation?.status === 'expired' ? 'Invitation expired' : invitation?.status || 'No invitation shown'}</p>
                  )}
                  {pending && <div className="text-sm text-gray-500 space-y-1 mb-3">
                    <p>Sent: {invitationTimestamp(invitation.issuedAt || invitation.createdAt)} · Expires: {invitationTimestamp(invitation.expiresAt)}</p>
                    <p>{deliveryLabel[invitation.deliveryStatus]}</p>
                  </div>}
                  {/* Role Badge */}
                  {employee.employeeRole && (
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded">
                        {employee.employeeRole}
                      </span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    {employee.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${employee.email}`} className="hover:text-orange-600">
                          {employee.email}
                        </a>
                      </div>
                    )}
                    {employee.phoneMobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <a href={`tel:${employee.phoneMobile}`} className="hover:text-orange-600">
                          {formatPhoneNumber(employee.phoneMobile)}
                        </a>
                        {employee.phoneOther && (
                          <span className="text-gray-400">
                            • {formatPhoneNumber(employee.phoneOther)}
                          </span>
                        )}
                      </div>
                    )}
                    {employee.address && employee.city && employee.state && employee.zipCode && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {employee.address}, {employee.city}, {employee.state} {employee.zipCode}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {employee.hireDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Hired: {new Date(`${employee.hireDate}T00:00:00`).toLocaleDateString()}</span>
                      </div>
                    )}
                    {employee.hourlyRate != null && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${employee.hourlyRate.toFixed(2)}/hr</span>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact */}
                  {employee.emergencyContactName && (
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Emergency Contact:</span> {employee.emergencyContactName}
                      {employee.emergencyContactPhone && (
                        <span> • {formatPhoneNumber(employee.emergencyContactPhone)}</span>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {employee.notes && (
                    <p className="mt-2 text-sm text-gray-500 italic">
                      {employee.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {pending ? <>
                    <button aria-label="Resend email" title="Resend email" disabled={!canInvite || invitationBusy || seconds > 0} onClick={() => act(invitation, 'resend')} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg disabled:opacity-50"><span className="relative block"><MailCheck className="w-5 h-5" /><RefreshCw className="absolute -bottom-1 -right-1 w-3 h-3 bg-white" /></span>{seconds > 0 && <span role="timer" className="block text-xs mt-1">{seconds}s</span>}</button>
                    <button aria-label="Regenerate link" title="Regenerate link" disabled={!canInvite || invitationBusy} onClick={() => act(invitation, 'regenerate')} className="p-2 text-sky-400 hover:bg-sky-50 rounded-lg disabled:opacity-50"><span className="relative block"><Link2 className="w-5 h-5" /><RefreshCw className="absolute -bottom-1 -right-1 w-3 h-3 bg-white" /></span></button>
                    <button aria-label="Revoke invitation" title="Revoke invitation" disabled={!canInvite || invitationBusy} onClick={() => act(invitation, 'revoke')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"><XCircle className="w-5 h-5" /></button>
                  </> : <>

                  <button
                    onClick={() => onEditEmployee(employee)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit employee"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    disabled={!canInvite || !employee.isActive || invitations.some(i => i.employeeId === Number(employee.id) && i.status !== 'revoked')}
                    onClick={() => onInviteEmployee(employee)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Invite existing employee"
                  >
                    <MailPlus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id!, employee.name || 'this employee')}
                    disabled={deletingId === employee.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete employee"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  </>}
                </div>
              </div>
            </div>
          ); })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeesList;
