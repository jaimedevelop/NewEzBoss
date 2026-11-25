export function customChatEndpoint(value: string): string {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.href.length > 2000) {
        throw new Error('Enter an HTTPS URL on port 443 without credentials, a query, or a fragment.');
    }
    url.pathname = url.pathname.replace(/\/+$/, '');
    if (!/\/chat\/completions$/i.test(url.pathname)) {
        url.pathname = url.pathname === '/' ? '/chat/completions' : `${url.pathname}/chat/completions`;
    }
    return url.href;
}
