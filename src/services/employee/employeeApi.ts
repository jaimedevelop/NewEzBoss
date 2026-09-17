import type { EmployeePortal, EmployeeTask, EmployeeWorkday, EmployeeMedia } from './employee.types';

const API_URL = import.meta.env.VITE_API_URL as string;
const SESSION_KEY = 'ezboss.employee.portal.session';
export const getEmployeeSession = () => sessionStorage.getItem(SESSION_KEY);
export const saveEmployeeSession = (token: string) => sessionStorage.setItem(SESSION_KEY, token);
export const clearEmployeeSession = () => sessionStorage.removeItem(SESSION_KEY);

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const token = getEmployeeSession();
  const headers = new Headers(init.headers);
  if (authenticated && token) headers.set('Authorization', `Bearer ${token}`);
  // Browser supplies the boundary for FormData. JSON is the only body we label.
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || 'Unable to reach the employee portal.'), { status: response.status });
  return body as T;
}
export async function exchangeEmployeeInvite(token: string) { return request<{ token: string; expiresInSeconds: number }>('/employee/access/exchange', { method: 'POST', body: JSON.stringify({ token }) }, false); }
export const getEmployeeMe = () => request<EmployeePortal>('/employee/me');
export const saveEmployeeOnboarding = (profile: { firstName: string; lastName: string; phone: string }) => request<EmployeePortal>('/employee/onboarding', { method: 'PUT', body: JSON.stringify(profile) });
export const employeeAttendance = (action: 'clock-in' | 'start-break' | 'end-break' | 'start-lunch' | 'end-lunch' | 'clock-out') => request<{ workday: EmployeeWorkday; serverNow: string }>(`/employee/attendance/${action}`, { method: 'POST', body: JSON.stringify({}) });
export const getEmployeeTasks = () => request<{ tasks: EmployeeTask[] }>('/employee/tasks');
export const completeEmployeeTask = (taskId: string) => request<{ task: EmployeeTask; alreadyCompleted: boolean }>(`/employee/tasks/${encodeURIComponent(taskId)}/complete`, { method: 'POST', body: JSON.stringify({}) });
export const uploadEmployeeTaskPhoto = (taskId: string, file: File, idempotencyKey: string) => { const data = new FormData(); data.append('file', file); return request<{ media: EmployeeMedia }>(`/employee/tasks/${encodeURIComponent(taskId)}/photos`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: data }); };
