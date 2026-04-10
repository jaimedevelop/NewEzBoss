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
    const path = event.path.replace(/^\/?\.netlify\/functions\/proxy/, '');

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

    // Forward all headers except host
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(event.headers)) {
        if (k.toLowerCase() === 'host') continue;
        if (v) headers[k] = v;
    }

    const upstream = await fetch(url, {
        method: event.httpMethod,
        headers,
        body: event.body ?? undefined,
    });

    const responseBody = await upstream.text();

    return {
        statusCode: upstream.status,
        headers: {
            'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
        body: responseBody,
    };
};