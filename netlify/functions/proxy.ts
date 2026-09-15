import type { Handler, HandlerEvent } from '@netlify/functions';

const PROVIDER_TARGETS: Record<string, string> = {
    anthropic: 'https://api.anthropic.com',
    openai: 'https://api.openai.com',
    google: 'https://generativelanguage.googleapis.com',
    deepseek: 'https://api.deepseek.com',
};

export const handler: Handler = async (event: HandlerEvent) => {
    // Path arrives as /proxy/anthropic/v1/messages → strip /.netlify/functions/proxy
    // because netlify.toml rewrites /proxy/* → /.netlify/functions/proxy/*
    const path = event.path.replace(/^\/?\.netlify\/functions\/proxy/, '').replace(/^\/proxy/, '');
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-goog-api-key, anthropic-version, anthropic-dangerous-direct-browser-access', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

    // First segment after /proxy/ is the provider key
    const match = path.match(/^\/([^/]+)(\/.*)?$/);
    if (!match) {
        return { statusCode: 400, body: 'Invalid proxy path' };
    }

    const [, provider, rest = ''] = match;
    const target = PROVIDER_TARGETS[provider];

    if (!target) {
        return { statusCode: 400, body: `Unknown provider: ${provider}` };
    }

    const qs = event.rawQuery ? `?${event.rawQuery}` : '';
    const url = `${target}${rest}${qs}`;

    const allowed = ['content-type', 'authorization', 'x-api-key', 'x-goog-api-key', 'anthropic-version', 'anthropic-dangerous-direct-browser-access'];
    const headers = Object.fromEntries(allowed.flatMap(k => event.headers[k] ? [[k, event.headers[k] as string]] : []));
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const upstream = await fetch(url, { method: event.httpMethod, headers, body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : event.body ?? undefined, signal: controller.signal });
        return { statusCode: upstream.status, headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' }, body: await upstream.text() };
    } catch {
        return { statusCode: 504, headers: cors, body: JSON.stringify({ error: { message: 'Provider request timed out or could not be reached.' } }) };
    } finally { clearTimeout(timeout); }
};
