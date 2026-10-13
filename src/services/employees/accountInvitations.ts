import { employeesApiRequest } from './employeesApi';
export interface AccountInvitation {
  id: string; email: string; positionId: string; employeeId: number | null;
  membershipId: string | null; status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string; issuedAt: string; expiresAt: string; deliveryStatus: 'not_requested' | 'sending' | 'provider_accepted' | 'failed' | 'unknown';
}
export interface InvitationResult { invitation: AccountInvitation; url?: string; deliveryStatus?: AccountInvitation['deliveryStatus']; replayed?: boolean }
export function invitationRequest<T>(membership: string, path = '', body?: unknown): Promise<T> {
  return employeesApiRequest<T>(`/employee-account-invitations${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { 'X-Company-Membership-Id': membership },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
export const deliveryLabel: Record<AccountInvitation['deliveryStatus'], string> = {
  not_requested: 'Email not requested', sending: 'Email sending — outcome not confirmed',
  provider_accepted: 'Email queued by provider (inbox delivery unconfirmed)',
  failed: 'Email delivery failed — resend to retry', unknown: 'Email outcome unknown — check mailbox or resend',
};

export type InvitationAction = 'resend' | 'regenerate' | 'revoke';
export const invitationTimestamp = (value: string) => new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
