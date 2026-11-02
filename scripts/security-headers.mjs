export function securityHeaders(env) {
  const origins = [];
  for (const [key, raw] of [['VITE_API_URL', env.VITE_API_URL], ['VITE_AUTH0_DOMAIN', env.VITE_AUTH0_DOMAIN && `https://${env.VITE_AUTH0_DOMAIN}`]]) {
    if (!raw) throw new Error(`${key} is required to build the deployment CSP`);
    const url = new URL(raw);
    if (url.username || url.password || (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error(`Unsafe ${key}`);
    origins.push(url.origin);
  }
  const policy = `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://cdn.auth0.com https://js.stripe.com; connect-src 'self' ${origins.join(' ')} https://api.stripe.com https://r.stripe.com; frame-src ${origins[1]} https://js.stripe.com https://hooks.stripe.com; upgrade-insecure-requests`;
  return `/*\n  Content-Security-Policy: ${policy}\n  Strict-Transport-Security: max-age=31536000\n`;
}
