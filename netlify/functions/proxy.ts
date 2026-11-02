import type { Handler } from '@netlify/functions';

// SEC-04: provider calls must use the authenticated, capability-checked API.
// Keep a tombstone for stale clients and direct function URLs.
export const handler: Handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({ error: 'The public AI relay has been retired. Use the authenticated AI service.' }),
});
