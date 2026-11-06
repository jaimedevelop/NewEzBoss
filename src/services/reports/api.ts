import { getApiAccessToken } from '../apiAuth';
import { adminFetch } from '../security/adminStepUp';
export async function reportsRequest<T>(path: string, options: RequestInit = {}, admin = false): Promise<T> {
    const token = await getApiAccessToken();
    const init = { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } };
    const response = await (admin ? adminFetch : fetch)(`${import.meta.env.VITE_API_URL}/reports${path}`, init);
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (body.code === 'ADMIN_STEP_UP_REQUIRED') {
            throw new Error('Authentication completed, but the API did not receive recent phishing-resistant MFA assurance. Check the Auth0 policy and signed access-token claims.');
        }
        throw new Error(body.error || 'Unable to connect to reports. Please retry.');
    }
    return response.status === 204 ? undefined as T : response.json();
}
export function notifyReportsChanged() { window.dispatchEvent(new Event('reports-changed')); }
