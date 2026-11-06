export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.34.15';
export type RecentError = {
    id: string;
    kind: 'network' | 'runtime' | 'promise';
    timestamp: string;
    requestId?: string;
    status?: number;
    method?: string;
    code?: string;
};
let errors: RecentError[] = [];
let installed = false;
export function recentErrors() { return errors.filter(e => Date.now() - Date.parse(e.timestamp) < 15 * 60000).slice(-20); }
function record(value: Omit<RecentError, 'id' | 'timestamp'>) { errors = [...errors.slice(-19), { ...value, id: crypto.randomUUID(), timestamp: new Date().toISOString() }]; }
export function clearReportDiagnostics() { errors = []; }
export function installReportDiagnostics() {
    if (installed)
        return;
    installed = true;
    window.addEventListener('error', () => record({ kind: 'runtime', code: 'UNCAUGHT_ERROR' }));
    window.addEventListener('unhandledrejection', () => record({ kind: 'promise', code: 'UNHANDLED_REJECTION' }));
    const original = window.fetch.bind(window);
    const apiOrigin = new URL(import.meta.env.VITE_API_URL || location.origin, location.origin).origin;
    window.fetch = async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
        const track = url.origin === apiOrigin && !url.pathname.startsWith('/reports');
        const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        try {
            const response = await original(input, init);
            if (track && response.status >= 400)
                record({ kind: 'network', status: response.status, method, requestId: response.headers.get('X-Request-Id') || undefined });
            return response;
        }
        catch (error) {
            if (track)
                record({ kind: 'network', status: 0, method, code: 'NETWORK_FAILED' });
            throw error;
        }
    };
}
