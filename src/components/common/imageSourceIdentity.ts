/** Compare private file content independently of its rotating download grant.
 * This is only a display identity; the server still verifies every download.
 */
export function imageSourceIdentity(src: string): string {
  try {
    const url = new URL(src);
    const match = url.pathname.match(/^(.*\/private-files\/)([^/]+)$/);
    if (!match) return src;
    const encoded = match[2].split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const grant = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof grant.key !== 'string' || !grant.key.startsWith('private/')) return src;
    return JSON.stringify([url.origin, match[1], grant.key, grant.type, grant.disposition]);
  } catch {
    return src;
  }
}
